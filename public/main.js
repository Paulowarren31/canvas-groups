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
      success: succ,
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

function succ(a){
  console.log(a)
}
