import QtQuick 1.1
import com.nokia.meego 1.1
import "component"
import "widget"
import "../js/main.js" as Script
import "../js/util.js" as Util

Item{
	id: root;

	property bool _inited: false;
	property int _index: 3;
	objectName: "idHomeItem";

	function _Init()
	{
		//if(!_inited) obj._GetInitData();
		_inited = true;
	}

	QtObject{
		id: obj;
		function _GetInitData(force)
		{
			if(!globals._IsValid()) return;

			if(!force && sessionmodel.__inited) return;

			root._inited = false;
			bBusy = true;
			sessionmodel._Reset();
			var s = function(data){
				globals._SetUserInfo(data.userinfo);
				globals.synckey = data.synckey;
				globals._Dump();
				sessionmodel._SetData(data.data);
				root._inited = true;
				obj._GetGroupInitData();
				bBusy = false;
			};
			var f = function(err){
				root._inited = false;
				controller._ShowMessage(err);
				bBusy = false;
			};

			Script.GetInitData(undefined, s, f);
		}

		function _GetGroupInitData()
		{
			if(!globals._IsValid()) return;
			if(!sessionmodel.__inited) return;

			var unames = [];
			Util.ModelForeach(sessionmodel, function(e){
				if(Script.idAPI.IsGroupUname(e.uname))
				unames.push(e.uname);
			});
			if(unames.length > 0)
			{
				appobj._GetUserContact(unames, function(data){
					sessionmodel._UpdateData(data);
				});
			}
		}
	}

	HomeListWidget{
		id: homeview;
		anchors.fill: parent;
		onRefresh: {
			obj._GetInitData();
		}
	}
}
