function complete(){
}
$(function(){
  $('[data-toggle="tooltip"]').tooltip()

  $('[id^=create]').on('click', e => {

    ids = e.target.id.split('-')[2]
    group_name = e.target.id.split('-')[1]

    data = {
      user_ids: ids,
      group_name: group_name
    }

    let url = 'https://smart-groups-canvas-groups.openshift.dsc.umich.edu/create' 
    $.ajax({
      type: 'POST',
      url: url,
      success: function(r){

        url = r.url
        $('#link-'+group_name).removeClass('hidden')
        $('#link-'+group_name).attr("href", url)

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
