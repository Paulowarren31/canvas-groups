$(function(){
  $('[id^=create]').on('click', e => {
    alert('clicked')

    let url = 'http://smart-groups-canvas-groups.openshift.dsc.umich.edu/test'
    $.ajax({
      type: 'POST',
      url: url,
      success: succ,
      data: {a:'a'},
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
