Canvas Smart groups
==================

This project is a LTI app for use with canvas

Endpoints
---------

* POST /
  The launch endpoint, checks for access token, if it doesnt exist sends to Canvas oauth, if it does, checks if user is opted in

* GET /oauth
  Where oauth is routed back to from Canvas, sets session data on the server with an access token, also creates a user in the database and redirects them to the optin page.

* POST /optin
  Expects an id value in the body of the request, sets that user's optin status to accepted

* POST /create
  Expects group_name and user_ids values in the body. creates a group in canvas with that name and invites and adds those user_ids



