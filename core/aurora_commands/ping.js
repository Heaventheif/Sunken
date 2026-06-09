const fs = require("fs-extra");

const path = require("path");

const axios = require("axios");

module.exports = {

  config: {

    name: "ping",

    author: "Aljur pogoy",

    description: "Check Aurora bot response time",

    role: 0,

  },

  handle(aurora, { event, args, threadID, messageID }) {

    try {

      const startTime = Date.now();

      aurora.sendMessage("Pinging...", threadID, () => {

        const ping = Date.now() - startTime;

        aurora.sendMessage(`Pong! Response time: ${ping}ms`, threadID);

      }, messageID);

    } catch (error) {

      aurora.sendMessage("Error pinging: " + error.message, threadID, messageID);

    }

  },

  trigger(aurora, { event, args, threadID, messageID }) {

    console.log(`[AURORA] Ping triggered by ${event.senderID}`);

  },

};