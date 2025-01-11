const axios = require('axios');
// semua settings di sini 
// hallo
const options = {
  creator: "NashTeam.",
  port: 8080,
  limit: 1000,
  
  token: "",
  chatId: "",
  webhook: ""
} 
  
module.exports = {
  options, 
 
  api: {
    prodia: "",
    openai: "", 
    gemini: "",
    bard:  "",
    google: {
    	clientId: "",
    	clientSecret: "",
    	callbackURL: ""
    }, 
    spotify: {
    	clientId: "",
    	clientSecret: ""
    },
    bing: []
  },
  
  smtp: {
  	email: "-",
  	pass: "-" // isi pakai token aplikasi email lu
  },
  
  mongoURL: "",
  message: async (text, mode) => {
  	try {
  		const { data } = await axios.post(`https://api.telegram.org/bot${options.token}/sendMessage`, {
  			chat_id: options.chatId,
  			text: text,
  			parse_mode: mode
          })
          
          console.log(data.ok)
      } catch (e) {
      	console.error(e)
      }
  },
  
  web: {
    title: "Atzix API", 
    footer: "Copyright © 2024 NashTeam.",
    tags: {
      "anime": "fas fa-ghost", 	
      "download": "fas fa-download",
      "ai": "fas fa-robot",
      "stalker": "fas fa-eye",
    },
  },
  
  msg: {
    nomor: {
      status: 403,
      creator: options.creator,
      message: "Masukan Parameter Nomor."
    },
    username: {
      status: 403,
      creator: options.creator,
      message: "Masukan Parameter Username."
    },
    query: {
      status: 403,
      creator: options.creator,
      message: "Masukan Parameter Query."
    },
    text: {
      status: 403,
      creator: options.creator,
      message: "Masukan Parameter Text."
    },
    param: {
      status: 403,
      creator: options.creator,
      message: "Parameter Invalid, silahkan cek lagi."
    },
    url: {
      status: 403,
      creator: options.creator,
      message: "Masukan Parameter URL."
    },
    user: {
      status: 403,
      creator: options.creator,
      message: "Masukan Parameter User Name."
    },
    id: {
      status: 403,
      creator: options.creator,
      message: "Masukan Parameter ID."
    },
    error: {
      status: 403,
      creator: options.creator,
      message: "Terjadi Kesalahan Saat Mengambil data."
    }
  }
}
