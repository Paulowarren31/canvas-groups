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
session = require('express-session')
asyn = require('async')


var host = 'https://umich-dev.instructure.com'

Schema = mongoose.Schema;

app.engine('handlebars', hbs({defaultLayout: 'main'}))
app.set('view engine', 'handlebars')

app.use(express.static(path.join(__dirname, 'public')));
app.use(cookieParser())
app.use(bp.json())
app.use(bp.urlencoded({extended: true}))

app.use(session({secret: process.env.SESSION_SECRET}))

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', 'https://umich-dev.instructure.com');
  next()
})

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

var mongo_pass = process.env.MONGO_PASS

mongoURL = 'mongodb://canvas:'+ mongo_pass +'@mongodb/users'

var UserSchema = new mongoose.Schema({
  user_id: String,
  name: String,
  accepted: Boolean
})

var User = mongoose.model('User', UserSchema)

mongoose.connect(mongoURL, function(err){
  if(err) console.log(err);
  console.log('connected to mongoDB')
})


app.post('/', function(req, res){
  console.log(req.session)
  if(req.session.c_token){
    let token = req.session.c_token
    console.log(token)
    shared_classes(req, res, token)
  }
  else if(req.session.r_token){
    refresh(req.session.r_token, (token, user) => {
      console.log('refreshed token ', token)
      res.session.c_token =  token
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

  var big_classes = []
  axios.get(host + '/api/v1/courses?access_token='+token)
    .then(function(classes){
      classes = classes.data
      for(cl in classes){
        cl = classes[cl]
        async function main(id, name, token){
          resp = await axios.get(host + '/api/v1/courses/'+id
            +'/students?access_token='+token)

          asyn.filter(resp.data, (user, callback) => {
            User.findOne({ 'user_id': user.id  }, (err, user) => {
              if(err){
                console.log(err)
                return callback(null, false)
              }
              if(user && user.accepted){
                console.log(user)
                console.log('user is in!')
                return callback(null, true)
              }
              callback(null, false)
            })
          }, (err, users) => {
            console.log('filtered users:', users)
            big_classes.push({
              name: name,
              id: id,
              users: users
            })

            //done with async stuff
            if(big_classes.length == classes.length){
              handleClasses(big_classes, token, (grouped_users, classes, groups) => {
                console.log('handle classes done with token ', token)

                //sort by descending # of classes matched
                grouped_users.sort( (a, b) => {
                  return b.classes.length - a.classes.length
                })

                classes.forEach( cls => {
                  cls.class_string = cls.classes.replace(/,[s]*/g, ", ");
                })

                //remove

                res.render('home', {
                  people: grouped_users,
                  classes: classes,
                  groups: groups
                })

              })
            }
          })
        }
        main(cl.id, cl.name, token);
      }

    })
    .catch(function(res){
      console.log(res.message)
    })
}

//
function handleClasses(classes, token, callback){
  console.log('handleClasses token: ' + token)
  dictionary = new Map();

  //get id of the user to make sure we don't include them
  getUserId(token).then(self_id => {
    classes.forEach( (cl) => {
      cl.users.forEach( (user) => {

        //dont include ourselves
        if(self_id == user.id) return

        //if user id exists in the dict, add classname to their list of classes
        if(dictionary.has(user.id)){
          dictionary.get(user.id).classes.push(cl.name)
          //console.log('dupe')
        }
        else{ //new key in dict
          user.classes = [cl.name] // set user.classes to be a list of class names
          dictionary.set(user.id, user) // user id => user
        }
      })
    })

    users = []
    classes_to_users = new Map(); // maps class names to lists of users

    dictionary.forEach( (u) => {
      //filter out users who only share 1 class
      if(u.classes.length > 1){
        users.push(u)
        sorted = u.classes.sort().toString()

        if(classes_to_users.has(sorted)){
          classes_to_users.get(sorted).push(u)
        }
        else{
          classes_to_users.set(sorted, [u])
        }
      }
    })

    classes = []
    classes_to_users.forEach((val, key) => {
      //key is list of classes shared, so this gets # of classes
      let c_c = key.split(',').length
      let students = val
      let s_ids = []

      students.forEach(student => { s_ids.push(student.id) })

      //remove spaces and commas from student id list
      s_ids = s_ids.toString().replace('/ ','/').replace('/,','/')

      //c_count is classes count
      //s_ids are ids of students in that class
      //added is whether or not this has a group created with it
      classes.push({'classes': key, 'students': val, 'c_count': c_c,
        's_ids': s_ids, 'added': false, 'link': ''})
    })

    //checks whether any of the users groups actually has a group created already
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

//es6 async :)
async function getUserId(token){
  let url = host + '/api/v1/users/self?access_token='+token
  user = await axios.get(url)
  return user.data.id
}

async function getUserEmail(id, token){
  let url = host + '/api/v1/users/'+ id +'/profile?access_token='+token

  profile = await axios.get(url)
  return profile.data.primary_email
}

//creates a new group with given ids and name of group
//expects body to have:
//group_name: name of group
//user_ids: list of ids separated by  , to be invited to the group
app.post('/create', function(req,res){
  var token = req.session.c_token

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
      let email = getUserEmail(id, token)

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

  }).catch(err =>{console.log(err)})
})

//oauth endpoint, 
app.get('/oauth', function(req,res){
  if(req.query.error == 'access_denied'){
    //access denied
  }
  //all good
  else{
    let code = req.query.code

    let url = host + '/login/oauth2/token'

    options = {
      code,
    }

    oauth2.authorizationCode.getToken(options, (error, result) => {
      if (error) {
        console.log('error', error)
        console.error('Access Token Error', error.message)
        return res.json('Authentication failed')
      }

      const token = result.access_token
      const ref_token = result.refresh_token

      let id = result.user.id
      let name = result.user.name

      //set some session variables
      req.session.c_token = token //access token
      req.session.r_token = ref_token //refresh token

      User.findOne({ 'user_id': id }, (err, user) => {
        if(err) console.log(err)
        if(user){
          console.log('auth found user already')
          if(user.accepted){
            shared_classes(req, res, token, user)
          }
          else{
            res.render('optin', {id: id})
          }
        }
        else{ //brand new user
          var user = new User({user_id: id, name: name, accepted: false})

          user.save((err, data) => {
            if(err) console.log(err)
            else console.log('Saved user: ', data)
            res.render('optin', {id: id})
          })
        }
      })
    })
  }
})


app.post('/optin', (req, res) => {
  let id = req.body.id
  console.log(id)
  User.findOne({ 'user_id': id }, (err, user) => {
    if(err){
      res.send({status: 'error'})
      console.log(err)
    }
    if(user){
      user.accepted = true
      user.save((err) => {
        if(err) console.log(err)
        else console.log('opted in user id', id)

        res.send({status: 'success'})
        /*

        if(req.session.c_token){
          let token = req.session.c_token
          shared_classes(req, res, token)
        }
        else if(req.session.r_token){
          refresh(req.session.r_token, (token, user) => {
            console.log('refreshed token ', token)
            res.session.c_token =  token
            shared_classes(req, res, token, user)
          })
        }
        else res.redirect('/')
        */
      })
    }
  })
})


// error handling
app.use(function(err, req, res, next){
  console.error(err.stack);
  res.status(500).send('Something bad happened!');
});

app.listen(port, ip);
console.log('Server running on http://%s:%s', ip, port);

module.exports = app ;
