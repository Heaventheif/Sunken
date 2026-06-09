
declare global {
  namespace ShadowBot {
    interface CommandConfig {
      name: string; 
      description?: string;
      usage?: string;
      nonPrefix?: boolean;
      author?: string;
      role?: number;
      cooldown?: number;
      aliases?: string[];
      disabled?: boolean;
      category?: string;
      nsfw?: boolean;
    }

    interface UserData {
      balance: number;
      bank: number;
      lastDaily?: number;
      account?: string | null;
      loan?: { amount: number; interest: number } | null;
      lastWork?: number; 
      car?: { model: string; value: number } | null;
      carCondition?: number;
      banned?: { reason: string; bannedAt: number } | boolean;
      strength?: number; 
      stamina?: number;  
      lastTraining?: number; 
      inFight?: string;
      boxing_account?: string | null;     
      xp?: number;
      level?: number;
    }     

    interface Command {
      config: CommandConfig;
      run?: (context: { api: any; event: any; prefix: string; args: string[]; db?: ShadowBot.Database | null }) => Promise<void>;
      handleEvent?: (context: EventContext) => Promise<void>;
      execute?: (
        api: API,
        event: any,
        args: string[],
        commands: Map<string, Command>,
        prefix: string,
        admins: string[],
        appState: any,
        sendMessage: SendMessageFn,
        apiHandler: any,
        usersData: Map<string, any>,
        globalData: Map<string, any>
      ) => Promise<void>;
      onReaction?: (context: { api: API; event: any; reaction: any; threadID: string; messageID: string; senderID: string }) => Promise<void>;
    }

    interface CommandContext {
      api: API;
      event: any;
      args: string[];
      apiHandler: any;
      usersData: Map<string, any>;
      globalData: Map<string, any>;
      admins: string[];
      prefix: string;
      db?: {
        db: (collectionName: string) => any;
      } | null;
    }

    interface EventContext {
      api: API;
      event: any;
    }

    interface API {
      sendMessage: (
        message: string | { body: string; attachment?: any },
        threadID: string,
        messageID?: string,
        callback?: (err: any, info: { messageID: string }) => void
      ) => void;
      changeNickname: (nickname: string, threadID: string, userID: string) => Promise<void>;
      getCurrentUserID: () => string;
      setOptions: (options: { [key: string]: any }) => void;
      listenMqtt: (callback: (err: any, event: any) => void) => () => void;
      getThreadInfo: (threadID: string) => Promise<any>;
      getUserInfo: (userIDs: string[]) => Promise<{ [key: string]: { name: string } }>;
    }

    type SendMessageFn = (
      api: API,
      messageData: {
        threadID: string;
        message: string | { body: string; attachment?: any };
        replyHandler?: (args: { api: any; event: any; attachments: any[]; data: any }) => Promise<void>;
        messageID?: string;
        senderID: string;
      }
    ) => Promise<any>;
    
    interface BotConfig {
      admins: string[];
      Prefix: string[];
      botName: string;
      mongoUri: string | null;
      [key: string]: any;
    }

    interface ThreadState {
      active: Map<string, { [key: string]: any }>;
      approved: Map<string, { approvedAt: Date }>;
      pending: Map<string, { addedAt: Date }>;
    }

    interface Client {
      reactionListener: { [key: string]: any };
      globalData: Map<string, any>;
    }

    interface Kagenou {
      replies: {
        [messageID: string]: {
          callback: (args: { api: any; event: any; attachments: any[]; data: any }) => Promise<void>;
          author: string;
          [key: string]: any;
        };
      };
      autodlEnabled?: boolean;
      replyListeners?: Map<string, { callback: (ctx: CommandContext) => Promise<void> }>;
    }

    interface ReactionData {
      messageID: string;
      threadID: string;
      authorID?: string;
      callback: (context: { api: API; event: any; reaction: any; threadID: string; messageID: string; senderID: string }) => Promise<void>;
    }

    interface Database {
      db: (collectionName: string) => any;
    }
  }
  
  var nsfwEnabled: Map<string, boolean>;
  var threadState: ShadowBot.ThreadState;
  var client: ShadowBot.Client;
  var Kagenou: ShadowBot.Kagenou;
  var db: ShadowBot.Database | null;
  var config: ShadowBot.BotConfig;
  var globalData: Map<string, any>;
  var usersData: Map<string, any>;
  var disabledCommands: Map<string, string[]>;
  var userCooldowns: Map<string, number>;
  var commands: Map<string, ShadowBot.Command>;
  var nonPrefixCommands: Map<string, ShadowBot.Command>;
  var eventCommands: ShadowBot.Command[];
  var reloadCommands: () => void;
  var startListeningForMessages: (api: ShadowBot.API) => () => void;
  var startListeningWithAutoRestart: (api: ShadowBot.API) => void;
  var getUserRole: (uid: string) => number;
  var loadBannedUsers: () => void;
  var setCooldown: (userID: string, commandName: string, cooldown: number) => void;
  var checkCooldown: (userID: string, commandName: string, cooldown: number) => string | null;
  var sendMessage: ShadowBot.SendMessageFn;
  var handleMessage: (api: ShadowBot.API, event: any) => Promise<void>;
  var handleReaction: (api: ShadowBot.API, event: any) => Promise<void>;
  var handleEvent: (api: ShadowBot.API, event: any) => Promise<void>;
  var handleReply: (api: ShadowBot.API, event: any) => Promise<void>;
  var loadCommands: () => void;
  var appState: any;
  var reactionData: Map<string, ShadowBot.ReactionData>;
  var threadConfigs: Map<string, { prefix: string }>;
}

export default {};
