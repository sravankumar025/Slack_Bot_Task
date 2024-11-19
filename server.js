const { App } = require("@slack/bolt");
require("dotenv").config();

// Initialize the Slack app with Bolt, using environment variables for configuration
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  appToken: process.env.SLACK_APP_TOKEN,
  socketMode: true,
});

// Command {/approval-test}to open the modal
//When we enter the command /approval-test in slack channel it will open the modal where we can create a request for approval
app.command("/approval-test", async ({ command, ack, client }) => {
  console.log("Received /approval-test command:", command);
  await ack();

  try {
    const users = await client.users.list();
    //Here we will be filtering the members of the channel excluding the bots which are there
    const userOptions = users.members
      .filter((user) => !user.is_bot && !user.deleted && user.id!='USLACKBOT')
      .map((user) => ({
        text: {
          type: "plain_text",
          text: user.real_name,
        },
        value: user.id,
      }));

    // This will open the modal with a dropdown of members and a textarea box to write something about approval request
    await client.views.open({
      trigger_id: command.trigger_id,
      view: {
        type: "modal",
        callback_id: "user_selection_modal",
        title: {
          type: "plain_text",
          text: "Create Approvals ",
        },
        blocks: [
          {
            "type": "divider"
          },
          {
            type: "section",
            block_id: "user_selection_section",
            text: {
              type: "mrkdwn",
              text: "Select a user from the channel:",
            },
            accessory: {
              type: "static_select",
              action_id: "user_select",
              placeholder: {
                type: "plain_text",
                text: "Select a user for approval ",
              },
              options: userOptions,
            },
          },
          {
            type: "input",
            block_id: "additional_comments_section",
            label: {
              type: "plain_text",
              text: "Write Additional Comments for your Approval:",
            },
            element: {
              type: "plain_text_input",
              action_id: "comments_input",
              multiline: true,
            },
          },
        ],
        //Submit button
        submit: {
          type: "plain_text",
          text: "Submit",
        },
        private_metadata: command.user_id,
      },
    });
  } catch (error) {
    console.error("Error opening modal:", error);
  }
});

// Handles the modal submission where the Approver will see the text sent by the reuester and two buttons Approve and Reject
app.view("user_selection_modal", async ({ view, ack, client }) => {
  await ack();

  const approverSelected =
    view.state.values.user_selection_section.user_select.selected_option.value;
  const additionalComments =
    view.state.values.additional_comments_section.comments_input.value;

     // Store the requester's ID so that we should notify back to this requester whether it is approved or rejected
  const requesterId =view.private_metadata;

  console.log(approverSelected, 'approver');

  try {
    await client.chat.postMessage({
      channel: approverSelected,
      text: `You have a new approval request!`,
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: additionalComments,
          },
        },
        {
          type: "actions",
          elements: [
            {
              type: "button",
              text: {
                type: "plain_text",
                text: "Approve",
              },
              value: "approve",
              action_id: "approve_button",
              // Store the requester ID in the button value
              value: JSON.stringify({ action: "approve", requesterId, additionalComments }),
            },
            {
              type: "button",
              text: {
                type: "plain_text",
                text: "Reject",
              },
              value: "reject",
              action_id: "reject_button",
              // Store the requester ID in the button value
              value: JSON.stringify({ action: "reject", requesterId, additionalComments }),
            },
          ],
        },
      ],
    });
  } catch (error) {
    console.error("Error sending message to approver:", error);
  }
});

// Handle button clicks, Where the approver will be clicking on approve button and the requester will be notified via requesterId
app.action("approve_button", async ({ body, ack, client,view }) => {
  await ack();

  const { action, requesterId, additionalComments } = JSON.parse(body.actions[0].value); 
  console.log(body.user,'userID');
  await client.chat.postMessage({
    channel: requesterId, 
    text: `Your request i.e, "${additionalComments}" has been approved!`,
  });
  await client.chat.postMessage({
    channel:body.user.id,
    text:`Request [ ${additionalComments} ] Aprroved, Thank you 😀`
  });

  await client.chat.update({
    channel: body.channel.id,
    ts: body.message.ts,
    text: "Request Approved. Thank you! 😀",
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "Request Approved. Thank you! 😀",
        },
      },
      {
        type: "context",
        elements: [
          {
            type: "plain_text",
            text: "This request has already been acted upon.",
          },
        ],
      },
    ],
  });
});

// Handle button clicks, Where the approver will be clicking on approve button and the requester will be notified via requesterId
app.action("reject_button", async ({ body, ack, client }) => {
  await ack();

  const { action, requesterId, additionalComments } = JSON.parse(body.actions[0].value); 
  await client.chat.postMessage({
    channel: requesterId, // Notify the requester
    text:`Your request "${additionalComments}" has been rejected!`,
  });

  await client.chat.postMessage({
    channel:body.user.id,
    text:`Request [ ${additionalComments} ] Rejected, Thank you 😢`
  });

  await client.chat.update({
    channel: body.channel.id,
    ts: body.message.ts,
    text: "Request Rejected. Thank you! 😢",
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "Request Rejected. Thank you! 😢",
        },
      },
      {
        type: "context",
        /*Here Iam using a plain text, so that when the approver clicks on approve or reject button the buttons will be disabled 
            and in that place the text will shown*/
        elements: [
          {
            type: "plain_text",
            text: "This request has already been acted upon.",
          },
        ],
      },
    ],
  });
});

(async () => {
  await app.start();
  console.log("FutureBlink Slack bot is running!");
})();