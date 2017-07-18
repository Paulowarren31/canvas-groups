$(function(){
  $('[data-toggle="tooltip"]').tooltip()

  $('[id^=create]').on('click', e => {
    ids = e.target.id.split('-')[2]
    group_name = e.target.id.split('-')[1]
    token = $.cookie('c_token')

    if(!token) {
      alert('unable to find canvas token, please refresh and make sure cookies are enabled');
    }

    data = {
      user_ids: ids,
      group_name: group_name,
      token: token
    }

    let url = 'https://smart-groups-canvas-groups.openshift.dsc.umich.edu/create' 
    $.ajax({
      type: 'POST',
      url: url,
      success: (r) => { // on success the groups url is returned
        url = r.group_url
        console.log('got url from server', url)

        //show the link to the new group
        $('#link-'+group_name).removeClass('hidden')
        $('#link-'+group_name).attr("href", url)

        //hide the create group button
        $(e.target).addClass('hidden')
      },
      error: (a, status, error) => {
        console.log(status)
        console.log(error)
      }, 
      data: data,
      dataType: 'json'
    })
  })

  $('[id^="add"]').on('click', e => {
    id = e.target.id.split('-')[1]
  })
  $('#create-btn').on('click', e => {
    $('[id=s-show]').toggleClass('hidden')
  })

  $('#student-btn').on('click', e => {

    $('#student-btn').addClass('bold')
    $('#class-btn').removeClass('bold')

    $('#student-list').removeClass('hidden')
    $('#classes-list').addClass('hidden')
  })

  $('#class-btn').on('click', e => {
    $('#class-btn').addClass('bold')
    $('#student-btn').removeClass('bold')

    $('#classes-list').removeClass('hidden')
    $('#student-list').addClass('hidden')
  })
})

function createClass(){}
