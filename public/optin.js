$(function(){
  $('#modal').modal('show')
  $('[id^=agree]').on('click', e => {

    id = $('[id^=agree]').attr('id').split('-')


    let url = 'https://smart-groups-canvas-groups.openshift.dsc.umich.edu/optin'

    let data = {
      id: id[1]
    }

    $.ajax({
      type: 'POST',
      url: url,
      success: (r) => { 
        if(r.status == 'success') location.reload()
      },
      error: (a, status, error) => {
        console.log(a, status, error)
        location.reload()
      },
      data: data,
      dataType: 'json'
    })

  })
})
