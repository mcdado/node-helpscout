/* eslint-env mocha */

require("dotenv").config();
const assert = require("assert");

const HelpScoutClient = require("../dist/index").default;

const clientId = process.env.HELPSCOUT_CLIENT_ID;
const clientSecret = process.env.HELPSCOUT_CLIENT_SECRET;

if (!clientId || !clientSecret) {
  throw new Error(
    'Please add HELPSCOUT_CLIENT_ID and HELPSCOUT_CLIENT_SECRET in a file called ".env" in the root of the project'
  );
}

let customerId;
let conversationId;
let mailboxId;

const customer = {
  firstName: "Testing",
  lastName: "Help Scout API",
  emails: [
    {
      type: "work",
      value: "testing" + Date.now() + "@gmail.com",
    },
  ],
};

const conversation = {
  subject: "Subject",
  customer: {
    id: 123456789,
  },
  mailboxId: 166129,
  type: "email",
  status: "closed",
  createdAt: new Date().toISOString().split(".")[0] + "Z",
  threads: [
    {
      type: "customer",
      customer: {
        id: 123456789,
      },
      text: "Hello, Help Scout. How are you?",
    },
  ],
};

let instance;

before(async function () {
  instance = new HelpScoutClient({
    clientId: clientId,
    clientSecret: clientSecret,
  });
  await instance.authenticate();
});

describe("Authentication", function () {
  it("Client Id and Secret should be specified", function () {
    assert.notEqual(clientId, "client-id");
    assert.notEqual(clientSecret, "client-secret");
  });

  it("Should return access token with expiration > now()", async function () {
    await instance.authenticate();
    assert(instance.apiTokens.expiresAt > Date.now());
  });
});

describe("List", function () {
  it("Can List Mailboxes", async function () {
    await instance.authenticate();
    const mailboxes = await instance.list("mailboxes");
    mailboxId = mailboxes[0].id;

    assert(
      mailboxes && Array.isArray(mailboxes) && mailboxes.length > 0,
      "No mailboxes found"
    );
  });

  it("Can List Conversations", async function () {
    await instance.authenticate();
    const conversations = await instance.list("conversations");
    conversationId = conversations[0].id;

    assert(
      conversations && Array.isArray(conversations) && conversations.length > 0,
      "No conversations found"
    );
  });

  it("Can List Customers", async function () {
    await instance.authenticate();
    const customers = await instance.list("customers");
    customerId = customers[0].id;

    assert(
      customers && Array.isArray(customers) && customers.length > 0,
      "No customers found"
    );
  });
});

describe("Create", function () {
  it("Can Create a Customer", async function () {
    customerId = await instance.create("customers", customer);
    assert(customerId);
  });

  it("Can Create a Conversation", async function () {
    conversation.customer.id = customerId;
    conversation.mailboxId = mailboxId;
    conversation.threads[0].customer.id = customerId;
    conversationId = await instance.create("conversations", conversation);
    assert(conversationId);
  });

  it("Can Create a Note in a Conversation with Create", async function () {
    await instance.create(
      "notes",
      { text: "Buy more pens" },
      "conversations",
      conversationId
    );
    // ensure this runs successfully, nothing returned
  });

  it("Can Create a Note in a Conversation with Helper", async function () {
    await instance.addNoteToConversation(conversationId, "Test Note");
    // ensure this runs successfully, nothing returned
  });
});

describe("Get", function () {
  it("Get Customer", async function () {
    const foundCustomer = await instance.get("customers", customerId);
    assert(foundCustomer);
  });

  it("Get Conversation", async function () {
    const foundConversation = await instance.get(
      "conversations",
      conversationId
    );
    assert(foundConversation);
  });

  it("Get Mailbox", async function () {
    const mailbox = await instance.get("mailboxes", mailboxId);
    assert(mailbox);
  });
});

describe("PUT and PATCH Update", function () {
  it("PUT Update Customer Name", async function () {
    await instance.updatePut("customers", customerId, {
      firstName: "New Name",
      lastName: "Testing Help Scout API",
    });

    const foundCustomer = await instance.get("customers", customerId);
    assert.equal(foundCustomer.firstName, "New Name");
  });

  it("PATCH Update Conversation Subject", async function () {
    await instance.updatePatch("conversations", conversationId, {
      op: "replace",
      path: "/subject",
      value: "super cool new subject",
    });

    const foundConversation = await instance.get(
      "conversations",
      conversationId
    );
    assert.equal(foundConversation.subject, "super cool new subject");
  });
});

describe("Delete", function () {
  it("Can Delete a Conversation", async function () {
    await instance.delete("conversations", conversationId);
  });
});
