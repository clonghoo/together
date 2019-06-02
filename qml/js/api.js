.pragma library

Qt.include("util.js");

var __JSON_Print = function(json)
{
	console.log(JSON.stringify(json));
};

function MakeTimestamp(ts)
{
	var d = new Date(ts * 1000);
	var today = new Date();
	today.setHours(0, 0, 0, 0);
	var today_time = today.getTime();
	var delta = ts - today_time / 1000;
	if(delta >= 0 && delta < 86400)
	{
		return Qt.formatTime(d, "hh:mm");
	}
	else
	{
		return Qt.formatDateTime(d, "yyyy/MM/dd hh:mm");
	}
}

var idWebAPI = {
	APPID: "wx782c26e4c19acffb",

	JSLOGIN: "https://login.wx.qq.com/jslogin",
	QRCODE: "https://login.wx.qq.com/qrcode/%1",
	LOGIN: "https://login.wx.qq.com/cgi-bin/mmwebwx-bin/login",
	REDIRECT: "https://wx.qq.com/cgi-bin/mmwebwx-bin/webwxnewloginpage",
	INIT: "https://wx.qq.com/cgi-bin/mmwebwx-bin/webwxinit",
	CONTACT: "https://wx.qq.com/cgi-bin/mmwebwx-bin/webwxgetcontact",
	CHECK: "https://webpush.wx.qq.com/cgi-bin/mmwebwx-bin/synccheck",
	SYNC: "https://wx.qq.com/cgi-bin/mmwebwx-bin/webwxsync",
	BATCH: "https://wx.qq.com/cgi-bin/mmwebwx-bin/webwxbatchgetcontact",
	SEND: "https://wx.qq.com/cgi-bin/mmwebwx-bin/webwxsendmsg",

	MakeImgPath: function(pic){
		if(pic.indexOf("http://") !== -1 || pic.indexOf("https://") !== -1)
			return pic;
		return "https://wx.qq.com" + pic;
	},

	MakeContent: function(c){
		String.prototype.replaceAll = function(s, t){
			return this.replace(new RegExp(s, "g"), t);
		}
		return c.replaceAll("&lt;", "<")
			.replaceAll("&gt;", ">");
	},

	IsGroupUname: function(uname){
		return uname.indexOf("@@") === 0;
	},

	CheckResponse: function(json){
		if(!json.BaseResponse)
			return;
		var resp = json.BaseResponse;
		if(resp.Ret != 0)
			//return "[%1]: %2".arg(resp.Ret).arg(resp.ErrMsg);
			return resp.Ret;
		else
			return 0;
	},

	MakeDeveceID: function()
	{
		var n = "";
		do
		{
			n += parseInt(Math.random() * 1e15).toString();
		}
		while(n.length < 15);

		return "e" + n.substr(0, 15);
	},

	MakeLoginUUID: function(text){
		if(!text)
			return false;
		try
		{
			var window = new Object();
			window.QRLogin = {};
			eval(text);
			if(window.QRLogin.code == 200)
				return window.QRLogin.uuid;
			else
				return false;
		}
		catch(e)
		{
			__JSON_Print(e);
			return false;
		}
	},

	MakeLoginState: function(text){
		if(!text)
			return false;
		try
		{
			var window = new Object();
			eval(text);
			return window;
		}
		catch(e)
		{
			__JSON_Print(e);
			return false;
		}
	},

	MakeLoginRedirect: function(text){
		if(!text)
			return false;
		try
		{
			var pattern = /^(\S)+/g;
			var m = text.match(pattern);
			if(m)
			{
				var xml = "<?xml version=\"1.0\" encoding=\"utf-8\"?>" + m[0];
				return xml;
			}
			else
				return false;
		}
		
		catch(e)
		{
			__JSON_Print(e);
			return false;
		}
	},

	MakeMyContact: function(json, container, limit){
		return this.MakeContact(json.MemberList, container, limit);
	},

	MakeHomeContact: function(json, container, limit){
		return this.MakeContact(json.ContactList, container, limit);
	},

	MakeUserContact: function(json, container, limit){
		return this.MakeContact(json.ContactList, container, limit);
	},

	MakeContact: function(list, container, limit){
		if(!Array.isArray(list))
			return false;
		var push = Array.isArray(container) ? "push" : "append";
		for(var i in list)
		{
			if(limit && i >= limit)
				break;

			var e = list[i];
			var item = this.MakeContactItem(e);
			container[push](item);
		}
		return i;
	},

	MakeContactItem: function(e, ret){
		var r = ret ? ret : {};

		r.uname = e.UserName;
		r.nickname = e.NickName;
		r.markname = e.RemarkName;
		r.groupname = e.DisplayName;
		r.avatar = this.MakeImgPath(e.HeadImgUrl);
		r.signature = e.Signature;
		r.sex = e.Sex;
		r.province = e.Province;
		r.city = e.City;
		r.verify = e.VerifyFlag;
		r.pinyin = e.PYQuanPin;
		r.pinyin_head = e.PYQuanPin ? e.PYQuanPin.charAt(0).toUpperCase() : "";

		if(!e.NickName && this.IsGroupUname(e.UserName))
		{
			var nn = [];
			var LIMIT = 3;
			for(var i in e.MemberList)
			{
				if(LIMIT && i >= LIMIT)
				{
					nn.push("...");
					break;
				}
				nn.push(e.MemberList[i].NickName);
			}
			r.nickname = nn.join(",");
		}

		r.msg = [];
		r.unread = 0;
		r.unsend = "";
		r.last_msg = "";

		return ret ? true : r;
	},

	MakeProfileInfo: function(json, ret){
		if(!json.User)
			return false;

		var r = ret ? ret : {};
		var u = json.User;

		r.uid = u.Uin;
		r.uname = u.UserName;
		r.nickname = u.NickName;
		r.avatar = this.MakeImgPath(u.HeadImgUrl);
		r.sex = u.Sex;
		r.signature = u.Signature;

		return ret ? true : r;
	},

	MakeCheckData: function(text){
		if(!text)
			return false;
		try
		{
			var window = new Object();
			eval(text);
			return window.synccheck;
		}
		catch(e)
		{
			__JSON_Print(e);
			return false;
		}
	},

	MakeSyncData: function(json, container, limit){
		var push = Array.isArray(container) ? "push" : "append";
		var list = json.AddMsgList;
		for(var i in list)
		{
			if(limit && i >= limit)
				break;

			var e = list[i];
			var from = e.FromUserName;
			var to = e.ToUserName;
			var group = false;
			var content = e.Content;
			if(this.IsGroupUname(from))
			{
				group = from;
				var pattern = /^(@\w+):<br\/?>(.*)$/;
				var m = content.match(pattern);
				if(m)
				{
					from = m[1];
					content = m[2];
				}
			}
			else if(this.IsGroupUname(to))
			{
				group = to;
				var pattern = /^(@\w+):<br\/?>(.*)$/;
				var m = content.match(pattern);
				if(m)
				{
					to = m[1];
					content = m[2];
				}
			}
			var item = {
				mid: e.MsgId,
				msg_type: e.MsgType,
				group: group,
				from: from,
				to: to,
				content: this.MakeContent(content),
				avatar: "",
				name: "",
				ts: e.CreateTime,
				ts_str: MakeTimestamp(e.CreateTime),
			};
			var c = MakeSessionId(e.FromUserName, e.ToUserName);
			item.session = c.session;
			item.type = c.type;
			container[push](item);
		}
		return i;
	},

	MakeSendData: function(json, ret){
		if(!json.MsgID)
			return false;

		var r = ret ? ret : {};

		r.mid = json.MsgID;
		r.local_id = json.LocalID;
		return ret ? true : r;
	},


};

var idAPI = idWebAPI;