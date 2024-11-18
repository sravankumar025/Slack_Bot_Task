const { App } = require("@slack/bolt");
const express = require('express');
const bodyParser = require('body-parser');
require("dotenv").config();

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  appToken: process.env.SLACK_APP_TOKEN,
  socketMode: true,
});
const expressApp = express();

// Body Parser Middleware
expressApp.use(bodyParser.json());

// Command to open the modal
app.command("/approval-test", async ({ command, ack, client }) => {
  // console.log("Received /approval-test command:", command);
  await ack();

  try {
    const users = await client.users.list();
    const userOptions = users.members
      .filter((user) => !user.is_bot && !user.deleted) // Exclude bots and deleted users
      .map((user) => ({
        text: {
          type: "plain_text",
          text: user.real_name,
        },
        value: user.id, // Slack user ID
      }));

    // Open the modal with the user dropdown
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

// Handle modal submission
app.view("user_selection_modal", async ({ view, ack, client }) => {
  await ack();

  const approverSelected =
    view.state.values.user_selection_section.user_select.selected_option.value;
  const additionalComments =
    view.state.values.additional_comments_section.comments_input.value;

  const requesterId =view.private_metadata; // Store the requester's ID

  // Send message to the selected approver
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
            text: additionalComments || "No additional comments provided.",
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

// Handle button clicks
app.action("approve_button", async ({ body, ack, client,view }) => {
  await ack();

  const { action, requesterId, additionalComments } = JSON.parse(body.actions[0].value); // Parse the value to get action and requesterId
  console.log(body.user,'userID');
  await client.chat.postMessage({
    channel: requesterId, // Notify the requester
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

app.action("reject_button", async ({ body, ack, client }) => {
  await ack();

  const { action, requesterId, additionalComments } = JSON.parse(body.actions[0].value); // Parse the value to get action and requesterId
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
  console.log("Slack bot is running!");
})();