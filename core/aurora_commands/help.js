const fs = require("fs");

const path = require("path");

const { format, UNIRedux } = require("cassidy-styler");

module.exports = {

  config: {

    name: "help",

    author: "Aljur Pogoy",

    description: "Shows all Aurora commands with custom style",

    role: 0,

  },

  handle(aurora, { event, args, threadID, messageID }) {

    const { readdirSync } = require("fs-extra");

    const commandFiles = readdirSync(__dirname).filter(file => file.endsWith(".js"));

    let content = "";

    commandFiles.forEach(file => {

      const command = require(path.join(__dirname, file));

      if (command.config && command.config.name) {

        content += `!${command.config.name}\n`;

      }

    });

    const helpMessage = format({

      title: "Aurora Help",

      titlePattern: `${UNIRedux.arrow} {word}`,

      titleFont: "double_struck",

      content: content + "Aurora System Developed by Aljur pogoy",

      contentFont: "bold",

    });

    aurora.sendMessage(helpMessage, threadID, null, messageID);

  },

  trigger(aurora, { event, args, threadID, messageID }) {

    console.log(`[AURORA] Help command triggered by ${event.senderID} in thread ${threadID}`);

  },

};