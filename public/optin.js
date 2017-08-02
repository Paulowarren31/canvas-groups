$(function(){
  $('#modal').modal({backdrop: 'static', keyboard: false})
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
        if(r.status == 'success') parent.location.href=parent.location.href
      },
      error: (a, status, error) => {
        console.log(a, status, error)
        parent.location.href=parent.location.href
      },
      data: data,
      dataType: 'json'
    })

  })
  $('#cancel').on('click', e => {
    window.history.back()
  })
})
