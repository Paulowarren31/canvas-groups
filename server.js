var express = require('express'),
  app     = express(),
  axios   = require('axios'),
  hbs     = require('express-handlebars'),
  path    = require('path'),
  SO      = require('simple-oauth2'),
  fs      = require('fs')
cookieParser = require('cookie-parser')
bp = require('body-parser')
mongoose = require('mongoose')


var host = 'https://umich-dev.instructure.com'

Schema = mongoose.Schema;

app.engine('handlebars', hbs({defaultLayout: 'main'}))
app.set('view engine', 'handlebars')

app.use(express.static(path.join(__dirname, 'public')));
app.use(cookieParser())
app.use(bp.json())
app.use(bp.urlencoded({extended: true}))

var port = process.env.PORT || process.env.OPENSHIFT_NODEJS_PORT || 8080,
  ip   = process.env.IP   || process.env.OPENSHIFT_NODEJS_IP || '0.0.0.0',
  mongoURL = process.env.OPENSHIFT_MONGODB_DB_URL || process.env.MONGO_URL,
  mongoURLLabel = "";

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

mongoURL = 'mongodb://paulo:password@mongodb/test'

var UserSchema = new mongoose.Schema({
  user_id: String,
  name: String,
  accepted: Boolean
})

mongoose.connect(mongoURL, function(err){
  if(err) console.log(err);
  console.log('connected to mongoDB')

  var MyModel = mongoose.model('Test', new Schema({ name: String }));
  // Works
  MyModel.findOne(function(error, result) { console.log(error); console.log(result);});

})

var User = mongoose.model('User', UserSchema)

app.post('/', function(req, res){
  console.log(req)
  console.log('Cookies: ', req.cookies)

  if(req.cookies.c_token){
    let token = req.cookies.c_token
    shared_classes(req, res, token)
  }
  else if(req.cookies.r_token){
    refresh(req.cookies.r_token, (token, user) => {
      console.log('refreshed token ', token)
      res.cookie('c_token', token, {expires: new Date(Date.now() + 3600000), secure: true})
      shared_classes(req, res, token, user)
    })
  }
  else res.redirect(authUri)
})

function refresh(token, callback){
  let r_url = host + '/login/oauth2/token'
  console.log('trying to refresh token', token)

  axios.post(r_url, {
    grant_type: 'refresh_token',
    client_id: '85530000000000009',
    refresh_token: token,
    client_secret: process.env.CANVAS_SECRET
  }).then(r => {
    console.log('got refreshed token: ', r.data)
    callback(r.data.access_token, r.data.user)
  }).catch(err =>{console.log(err)})

}

app.get('/', function(req, res){
  res.redirect(authUri)
})

function shared_classes(req, res, token, user){

  if(user){
  }

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
            handleClasses(big_classes, token, (grouped_users, classes, groups) => {
              console.log('handle classes done with token ', token)

              grouped_users.sort( (a, b) => {
                return b.classes.length - a.classes.length
              })

              res.render('home', {
                people: grouped_users,
                classes: classes,
                groups: groups
              })


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

//all classes in the array now.catch()
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

    classes_to_users.forEach((val, key) => {
      c_c = key.split(',').length
      students = val
      s_ids = []

      students.forEach(student => { s_ids.push(student.id) })

      //remove spaces and commas
      s_ids = s_ids.toString().replace('/ ','/').replace('/,','/')

      console.log('s_ids: ', s_ids)

      classes.push({'classes': key, 'students': val, 'c_count': c_c,
        's_ids': s_ids, 'added': false, 'link': ''})
    })

    let groups_endpoint = host + '/api/v1/users/self/groups'
    axios.get(groups_endpoint, {headers: { Authorization: "Bearer " + token }})
      .then(r => {
        let groups = r.data

        groups.forEach(group => {
          classes.forEach(cls => {
            console.log('grp name: ', group.name)
            console.log('cls name: ', cls.classes)

            if(group.name == cls.classes){
              cls.added = true
              cls.link = 'https://umich-dev.instructure.com/groups/'+ group.id
            }
          })
        })

        callback(users, classes)
      })

  }).catch(err =>{console.log(err)})
}

async function getUserId(token){
  let url = host + '/api/v1/users/self?access_token='+token
  user = await axios.get(url)
  return user.data.id
}

function getUserEmail(id, token, callback){
  let url = host + '/api/v1/users/'+ id +'/profile?access_token='+token

  try{
    axios.get(url).then(profile => {
      let email = profile.data.primary_email
      console.log('got email ', email)
      callback(email)
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

  if(!token){
    res.send('error, please refresh and get a new token')
  }

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
    //console.log('create group with token ',token)
    //console.log('create group got ', r.data)

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
            invitees: user_emails
          }, {
            headers: { Authorization: "Bearer " + token }
          }).then(r => {

            console.log('updated group')

            user_ids.forEach( id => {
              let join_url = host + '/api/v1/groups/'+grp_id+'/users/'+id+'?workflow_state=accepted'

              console.log('sending update membership', join_url)

              axios.put(join_url, {
                workflow_state: 'accepted'
              }, {
                headers: { Authorization: "Bearer " + token }
              }).then(r => {
                console.log('accepted invite for user id: '+ id, token)
              }).catch(err =>{console.log(err)})
            })

            res.send({group_url: group_url}) //pass group url back to frontend

          }).catch(err => {console.log('INVITE ERROR');console.log(err);})

        }

      })
    })

  }).catch(err =>{console.log(err)})
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

      console.log(result)

      const token = result.access_token
      const ref_token = result.refresh_token

      let user = result.user

      let new_user = new User({user_id: user.id, name: user.name, accepted: false})

      new_user.save(err => {console.log('saved user!')})

      res.cookie('c_token', token, {expires: new Date(Date.now() + 3600000), secure: true})
      res.cookie('r_token', ref_token, {secure: true})

      shared_classes(req, res, token, user)
    })
  }
})

// error handling
app.use(function(err, req, res, next){
  console.error(err.stack);
  res.status(500).send('Something bad happened!');
});

app.listen(port, ip);
console.log('Server running on http://%s:%s', ip, port);

module.exports = app ;
