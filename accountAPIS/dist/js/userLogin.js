if (typeof jQuery != 'undefined') {

    // $(document).ready(function () {
    // let form = $('#form-login'),
    //     formMessages = $('.form-messages');

    // console.log('query: ' + getUrlVars()['from'])
    // form.on('submit', (e) => {
    //   e.preventDefault();
    //   let formData = {
    //           'name': $('input[name=email]').val(),
    //           'password': $('input[name=password]').val()
    //         },
    //       query = getUrlVars()['from'];

    //   $.ajax({
    //     type: 'POST',
    //     url:'http://localhost:3000/login',
    //     data: formData,
    //     dataType: 'json'
    //   })
    //     .done((res) => {
    //       alert('pass' + res)
    //     })
    //     .fail((res) => {
    //       alert('fail' + res)
    //     })
    // }) 
    function login() {
        // Get the form.
        var form = $('#form-login');
        // Serialize the form data.
        var formData = $(form).serialize();
        $.post("/Login", formData,
            function (data) {
                if (data.status == false) {
                    $('#formMessage').html(data.message)
                } else {
                    window.location.href = '/courses/blockchain-basic/history-of-blockchain.html';
                }
            });
    }

    function signUp() {
        // Get the form.
        var form = $('#form-signup');
        // Serialize the form data.
        var formData = $(form).serialize();
        $.post("/signup", formData,
            function (data) {
                if (data.status == false) {
                    $('#formMessage').html(data.message)
                } else {
                    window.location.href = '/courses/blockchain-basic/history-of-blockchain.html';
                }
            });
    }
    // });
}
