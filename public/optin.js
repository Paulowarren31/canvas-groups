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
        alert('you did it now you can refresh')
      },
      error: (a, status, error) => {

      },
      data: data,
      dataType: 'json'
    })

  })
})
