var express = require('express'),
  app     = express(),
  axios   = require('axios'),
  hbs     = require('express-handlebars'),
  path    = require('path'),
  SO      = require('simple-oauth2'),
  fs      = require('fs')


var host = 'https://umich-dev.instructure.com'

mongoose = require('mongoose')
Schema = mongoose.Schema;


app.use(express.static(path.join(__dirname, 'public')));

app.engine('handlebars', hbs({defaultLayout: 'main'}))
app.set('view engine', 'handlebars')


app_secret = process.env.CANVAS_SECRET

console.log(app_secret)

oauth2 = SO.create({
  client: {
    id: '85530000000000009',
    secret: process.env.CANVAS_SECRET,
  },
  auth: {
    tokenHost: 'https://umich-dev.instructure.com',
    tokenPath: '/login/oauth2/token',
    authorizePath: '/login/oauth2/auth'
  },
})

authUri = oauth2.authorizationCode.authorizeURL({
  redirect_uri: 'https://smart-groups-canvas-groups.openshift.dsc.umich.edu/oauth',
})


var port = process.env.PORT || process.env.OPENSHIFT_NODEJS_PORT || 8080,
  ip   = process.env.IP   || process.env.OPENSHIFT_NODEJS_IP || '0.0.0.0',
  mongoURL = process.env.OPENSHIFT_MONGODB_DB_URL || process.env.MONGO_URL,
  mongoURLLabel = "";

mongoURL = 'mongodb://userXY2:R4g2BeUTNjFljKDk@mongodb/auth-tokens'

var a_schema = new mongoose.Schema({
  user_id: String,
  token: String,
  expires: Number
})


mongoose.connect(mongoURL, {useMongoClient: true}).then(function(){

  Auth = mongoose.model('Auth', a_schema)

  console.log('connected to mongoDB')
})

var bp = require('body-parser')
app.use(bp.json())
app.use(bp.urlencoded({extended: true}))

app.post('/', function(req, res){

  res.redirect(authUri)

})

function shared_classes(req, res, token){

  var big_classes = []
  axios.get(host + '/api/v1/courses?access_token='+token)
    .then(function(classes){
      classes = classes.data
      for(cl in classes){
        cl = classes[cl]
        async function main(id, name, token){
          resp = await axios.get(host + '/api/v1/courses/'+id
            +'/students?access_token='+token)

          big_classes.push({
            name: name,
            id: id,
            users: resp.data
          })

          //done with async stuff
          if(big_classes.length == classes.length){
            handleClasses(big_classes, token, function(grouped_users, classes){
              console.log('handle classes done with token ', token)

              res.render('home', {
                people: grouped_users,
                classes: classes,
                token: token})

            })
          }
        }
        main(cl.id, cl.name, token);
      }

    })
    .catch(function(res){
      console.log(res.message)
    })
}

//all classes in the array now
function handleClasses(classes, token, callback){
  console.log('handleClasses token: ' + token)
  dictionary = new Map();


  getUserId(token).then(self_id => {
    classes.forEach(function(cl){
      cl.users.forEach(function(user){

        //dont include ourselves
        if(self_id == user.id) return

        if(dictionary.has(user.id)){
          dictionary.get(user.id).classes.push(cl.name)
          //console.log('dupe')
        }
        else{
          //console.log(cl)
          user.classes = [cl.name]
          dictionary.set(user.id, user)
        }
      })
    })


    users = []
    classes_to_users = new Map();


    dictionary.forEach(function(item){
      //filter out users who only share 1 class
      if(item.classes.length > 1){
        users.push(item)

        sorted = item.classes.sort().toString()

        if(classes_to_users.has(sorted)){
          classes_to_users.get(sorted).push(item)
        }
        else{
          classes_to_users.set(sorted, [item])
        }
      }
    })

    classes = []

    classes_to_users.forEach(function(val, key){
      c_c = key.split(',').length
      students = val
      s_ids = []

      students.forEach(function(student){
        s_ids.push(student.id)
      })

      classes.push({'classes': key, 'students': val, 'c_count': c_c, 's_ids': s_ids})
    })


    callback(users, classes)

  }).catch(err =>{console.log(err.message)})

}

async function getUserId(token){
  let url = host + '/api/v1/users/self?access_token='+token
  user = await axios.get(url)
  return user.data.id
}

function getUserEmail(id, token, callback){
  console.log('getUserEmail', token)
  let url = host + '/api/v1/users/'+ id +'/profile?access_token='+token

  console.log(url)

  try{
    axios.get(url).then(profile => {
      console.log('got email ', profile.data)
      callback(profile.data.primary_email)
    })
  } catch(e){
    console.error('exception', e)
    callback('')
  }
}

//creates a new group with given ids and name of group
//expects body to have:
//group_name: name of group
//user_ids: list of ids separated by  , to be invited to the group
app.post('/create', function(req,res){
  var token = req.body.token

  let url = host + '/api/v1/groups?access_token=' + token

  console.log('server got create request for group name '+ req.body.group_name
    +' and ids: '+ req.body.user_ids + ' with token ' + token)

  //post request to create group
  axios.post(url, {
    name: req.body.group_name,
    description: 'this is a group',
    is_public: true,
    join_level: 'invitation_only',
  }, {
    headers: { Authorization: "Bearer " + token }
  }).then(r => {
    console.log('create group with token ',token)
    console.log('create group got ', r.data)

    let grp_id = r.data.id
    let invite_url = host + '/api/v1/groups/'+ grp_id + '/invite'

    let group_url = host + '/groups/' + grp_id


    let user_ids = req.body.user_ids.split(',')
    let user_emails = []

    // for each user id, get their email
    user_ids.forEach( id => {
      getUserEmail(id, token, email => {

        user_emails.push(email)

        if(user_emails.length == user_ids.length){

          axios.post(invite_url, {
            invitees: user_ids
          }, {
            headers: { Authorization: "Bearer " + token }
          }).then(r => {
            console.log('updated group')

            user_ids.forEach(function(id){
              let join_url = host + '/api/v1/groups/'+grp_id+'/users/'+id+'?workflow_state=accepted'

              axios.put(join_url, {}, {
                headers: { Authorization: "Bearer " + token }
              }).then(r => {
                console.log('accepted invite for user id: '+ id, token)
              }).catch(err =>{console.log(err.message)})


            })
          })

        }

      })
    })

  }).catch(err =>{console.log(err.message)})

})

//step 2 oauth
app.get('/oauth', function(req,res){
  if(req.query.error == 'access_denied'){
    //access denied
  }
  //all good
  else{
    console.log('all good')
    let code = req.query.code

    let url = host + '/login/oauth2/token'

    options = {
      code,
    }

    oauth2.authorizationCode.getToken(options, (error, result) => {

      if (error) {
        console.error('Access Token Error', error.message);
        return res.json('Authentication failed');
      }

      const token = result.access_token

      shared_classes(req, res, token)
    })
  }

  /*
    axios.post(url, {
      client_id: '85530000000000009',
      redirect_uri: 'https://smart-groups-canvas-groups.openshift.dsc.umich.edu/oauth',
      client_secret: 'TYTObhzFa47uR9ms7pJthHQ7QEOm7quGdx2xopPKic23WkfrJ3bkYhHibjjGpgxW',
      code: req.query.code,
      grant_type: 'authorization_code'
    }).then(r => {

      console.log(r.data)

      let access_token = r.data.access_token
      let user_id = r.data.user.id



      var session = new Auth({user_id: '123', token: access_token, expires: 1})

      session.save(function(err){
        if(err){
          console.log(err)
        } else {
          console.log('saved session')
          res.redirect('/')
        }
      })

    })

  }
  */
})


// error handling
app.use(function(err, req, res, next){
  console.error(err.stack);
  res.status(500).send('Something bad happened!');
});

app.listen(port, ip);
console.log('Server running on http://%s:%s', ip, port);

module.exports = app ;
