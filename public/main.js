$(function(){
  $('[data-toggle="tooltip"]').tooltip()

  $('[id^=create]').on('click', e => {
    console.log(e)

    let url = 'http://smart-groups-canvas-groups.openshift.dsc.umich.edu/create'
    /*
    $.ajax({
      type: 'POST',
      url: url,
      success: succ,
      data: {a:'a'},
      dataType: 'json'
    })
    */
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
