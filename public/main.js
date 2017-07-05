function complete(){
}
$(function(){
  $('[data-toggle="tooltip"]').tooltip()

  $('[id^=create]').on('click', e => {
    ids = e.target.id.split('-')[2]
    group_name = e.target.id.split('-')[1]

    data = {
      user_ids: ids,
      group_name: group_name,
    }

    let url = 'https://smart-groups-canvas-groups.openshift.dsc.umich.edu/create' 
    $.ajax({
      type: 'POST',
      url: url,
      success: (r) => {
        url = r.group_url
        console.log('got url from server', url)
        console.log('#link-'+group_name)

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
      complete: complete,
      data: data,
      dataType: 'json'
    })
  })

  $('#student-btn').on('click', e => {
    $('#student-list').removeClass('hidden')
    $('#classes-list').addClass('hidden')
  })

  $('#class-btn').on('click', e => {
    $('#classes-list').removeClass('hidden')
    $('#student-list').addClass('hidden')
  })
})
