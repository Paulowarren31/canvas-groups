$(function(){
  alert('opt in');
  $('opt-btn').on('click', e => {

    let url = 'https://smart-groups-canvas-groups.openshift.dsc.umich.edu/optin'

    let data = {
      id: '123'
    }

    $.ajax({
      type: 'POST',
      url: url,
      success: (r) => { 
        alert('you did it now you can refresh')
      },
      error: (a, status, error) => {
        console.log(status)
        console.log(error)
      },
      data: data,
      dataType: 'json'
    })

  })
})
