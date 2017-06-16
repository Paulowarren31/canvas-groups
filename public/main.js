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
})

function succ(a){
  console.log(a)
}
