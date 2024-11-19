Architecture Diagram of SlackBot
https://app.eraser.io/workspace/7NXbRjnWiirnjxqBVodu?origin=share

SLACK APPROVAL BOT
Requirements : 
Create a slash command -> /approval-test
When slash command is triggered, a modal should open that should take two inputs & one button
      1. Dropdown of members of Slack (This is the person who will approve the request) - for selecting approver
      2. A Text area where text can be written for approval.
      3. A Submit button
When the submit button is clicked, the approval text should be sent to Approver with 2 buttons.
      1. Approve
      2. Reject
Upon Approval or Rejection, the Requester should be notified on Slack.
