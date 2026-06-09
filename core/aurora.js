/* 
* @author Aurora
*/


const fs = require("fs-extra");

const path = require("path");

const axios = require("axios");

const auroraCommands = new Map();

const aurora = {

  sendMessage: function(message, threadID, callback, messageID) {

    return this.api.sendMessage(message, threadID, callback, messageID);

  }

};

function loadAuroraConfig() {

  const configPath = path.join(__dirname, "../config.aurora.json");

  if (fs.existsSync(configPath)) {

    global.auroraConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));

    console.log("[AURORA] Loaded config:", global.auroraConfig);

  } else {

    global.auroraConfig = { prefix: "!", adminUid: [] };

    fs.writeFileSync(configPath, JSON.stringify(global.auroraConfig, null, 2));

    console.log("[AURORA] Created default config.aurora.json");

  }

}

function loadAuroraCommands() {

  auroraCommands.clear();

  const auroraCommandsDir = path.join(__dirname, "aurora_commands");

  fs.readdirSync(auroraCommandsDir).forEach(file => {

    if (file.endsWith(".js")) {

      const command = require(path.join(auroraCommandsDir, file));

      auroraCommands.set(command.config.name, command);

      console.log(`[AURORA] Loaded command: ${command.config.name}`);

    }

  });

}

function isAuroraAdmin(senderID) {

  return global.auroraConfig.adminUid.includes(String(senderID));

}

function handleAuroraCommand(api, event) {

  if (!global.auroraConfig) loadAuroraConfig();

  aurora.api = api; 

  const { body, threadID, messageID, senderID } = event;

  if (!body || !body.startsWith(global.auroraConfig.prefix)) return;

  const commandName = body.split(" ")[0].slice(global.auroraConfig.prefix.length).toLowerCase();

  const args = body.split(" ").slice(1);

  const command = auroraCommands.get(commandName);

  if (command) {

    try {

      if (command.config.role && !isAuroraAdmin(senderID)) {

        aurora.sendMessage("Access denied, bro!", threadID, messageID);

        return;

      }

      command.handle(aurora, { event, args, threadID, messageID });

      if (command.trigger) command.trigger(aurora, { event, args, threadID, messageID });

    } catch (error) {

      console.error(`[AURORA] Error in ${commandName}:`, error.message);

      aurora.sendMessage("Error: " + error.message, threadID, messageID);

    }

  }

}

module.exports = { handleAuroraCommand, loadAuroraCommands };
