var express = require('express'),
  app     = express(),
  axios   = require('axios'),
  hbs     = require('express-handlebars'),
  path    = require('path');

app.use(express.static(path.join(__dirname, 'public')));

app.engine('handlebars', hbs({defaultLayout: 'main'}))
app.set('view engine', 'handlebars')

var port = process.env.PORT || process.env.OPENSHIFT_NODEJS_PORT || 8080,
  ip   = process.env.IP   || process.env.OPENSHIFT_NODEJS_IP || '0.0.0.0',
  mongoURL = process.env.OPENSHIFT_MONGODB_DB_URL || process.env.MONGO_URL,
  mongoURLLabel = "";

var bp = require('body-parser')
app.use(bp.json())
app.use(bp.urlencoded({extended: true}))

var token = '8553~7G6yIufBJhp30vX9A6NYC68aHSEeBxlm0LalJI1ARASZ4UWFq9bXBhWZGx3dPZiV'

app.post('/', function(req, res){
  var big_classes = []
  axios.get('https://umich-dev.instructure.com/api/v1/courses?access_token='+token)
    .then(function(classes){

      classes = classes.data
      for(cl in classes){
        cl = classes[cl]
        async function main(id, name){
          resp = await axios.get('https://umich-dev.instructure.com/api/v1/courses/'+id
            +'/students?access_token='+token)

          big_classes.push({
            name: name,
            id: id,
            users: resp.data
          })

          //done with async stuff
          if(big_classes.length == classes.length){
            handleClasses(big_classes, function(grouped_users, classes){
              console.log(classes)

              res.render('home', {
                title: 'Hey',
                message: 'Hello there!',
                people: grouped_users,
                classes: classes})

            })
          }
        }
        main(cl.id, cl.name);
      }
    })
    .catch(function(res){
      console.log(res)
    })
})

//all classes in the array now
function handleClasses(classes, callback){
  dictionary = new Map();


  getUserId().then(self_id => {
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

  })
}

async function getUserId(){
  let url = 'https://umich-dev.instructure.com/api/v1/users/self?access_token='+token
  user = await axios.get(url)
  return user.data.id
}

async function getUserEmail(id){
  let url = 'https://umich-dev.instructure.com/api/v1/users/'+id
    +'/profile?access_token='+token

  profile = await axios.get(url)
  return profile.data.primary_email
}

//creates a new group with given ids and name of group
//expects body to have:
//group_name: name of group
//user_ids: list of ids separated by  , to be invited to the group
app.post('/create', function(req,res){
  let url = 'https://umich-dev.instructure.com/api/v1/groups?access_token='
    +token

  console.log('server got create request for group name '+ req.body.group_name
                +' and ids: '+ req.body.user_ids)

  //post request to create group
  /*
  axios.post(url, {
    name: req.body.group_name,
    description: 'this is a group',
    is_public: true,
    join_level: 'invitation_only',
  }, {
    headers: { Authorization: "Bearer " + token }
  }).then(r => {

    let grp_id = r.data.id
    let invite_url = 'https://umich-dev.instructure.com/api/v1/groups/'+grp_id
      +'/invite?access_token='+token


    let user_ids = req.body.user_ids.split(',')
    let user_emails = []

    // for each user id, get their email
    user_ids.forEach(function(id){
      getUserEmail(id).then(e => {
        user_emails.push(e)

        //all user emails ready
        if(user_emails.length == user_ids.length){

          //send invite
          axios.post(invite_url, {
            invitees: user_emails
          }, {
            headers: { Authorization: "Bearer " + token }
          }).then(r => {
            res.send('success!' + user_emails + ' have been invited ')

            user_ids.forEach(function(id){
              let join_url = 'https://umich-dev.instructure.com/api/v1/groups/'+grp_id+'/users/'+id+'?workflow_state=accepted'

              axios.put(join_url, {}, {
                headers: { Authorization: "Bearer " + token }
              }).then(r => {
                console.log(r)
                console.log('accepted invite for user id: '+ id)
              })
            })
          })
        }
      })
    })


  })
  */
})

//step 1 oauth
app.get('/test', function(req, res){
  res.redirect('https://learn-lti.herokuapp.com/login/oauth2/auth?'+
    'client_id=3536&response_type=code&redirect_uri=http://0.0.0.0:8080/test2')
})

//step 2 oauth
app.get('/test2', function(req,res){
  console.log(req.query)
  if(req.query.error == 'access_denied'){
    //access denied
  }
  //all good
  else{

    let url = 'https://learn-lti.herokuapp.com/login/oauth2/token'

    axios.post(url, {
      client_id: '3536',
      redirect_uri: 'http://0.0.0.0:8080/test2',
      client_secret: '63b0b9ce3d9b23a487c2',
      code: req.query.code
    }).then(r => console.log(r))

  }
})

//step 3?
app.get('/test3', function(req, res){
  res.send('idk')
})

// error handling
app.use(function(err, req, res, next){
  console.error(err.stack);
  res.status(500).send('Something bad happened!');
});

app.listen(port, ip);
console.log('Server running on http://%s:%s', ip, port);

module.exports = app ;
