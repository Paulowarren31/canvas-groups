function complete(){
}
$(function(){
  console.log($.cookie('canvas_token'))
  $('[data-toggle="tooltip"]').tooltip()

  $('[id^=create]').on('click', e => {
    ids = e.target.id.split('-')[2]
    group_name = e.target.id.split('-')[1]
    token = $.cookie('canvas_token')

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
      success: function(r){
        url = r.group_url
        console.log('got url from server', url)
        console.log('#link-'+group_name)

        //show the link to the new group
        $('#link-'+group_name).removeClass('hidden')
        $('#link-'+group_name).attr("href", url)

        //hide the create group button
        $(e.target).addClass('hidden')
      },
      error: function(a, status, error){
        console.log(status)
        console.log(error)
      }, 
      complete: complete,
      data: data,
      dataType: 'json'
    })
  })

  $('#student-btn').on('click', function(e){
    $('#student-list').removeClass('hidden')
    $('#classes-list').addClass('hidden')
  })

  $('#class-btn').on('click', function(e){
    $('#classes-list').removeClass('hidden')
    $('#student-list').addClass('hidden')
  })
})
