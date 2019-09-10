#include "downloadtask.h"

#include <QFile>
#include <QNetworkAccessManager>
#include <QNetworkReply>
#include <QNetworkRequest>
#include <QUrl>
#include <QDebug>

#include "id_std.h"

	idDownloadTask::idDownloadTask(QObject *parent)
	: idTransferTask_base(parent)
{
	SetType(idTransferTask_base::Type_Download);
	setObjectName("idDownloadTask");
}

idDownloadTask::~idDownloadTask()
{
	ID_QOBJECT_DESTROY_DBG
}

void idDownloadTask::Transfer()
{
	if(m_status != idTransferTask_base::Status_Ready)
		return;
	if(!Begin())
	{
		SetStatus(idTransferTask_base::Status_Error);
		SetError(-1);
		emit finished(m_error);
		return;
	}

	SetStatus(idTransferTask_base::Status_Doing);
	emit started();

	// if media is video, must add this header
	QMap<QByteArray, QByteArray> headers;
	headers.insert("Range", "bytes=0-");

	m_reply = Request(m_remoteUrl, QByteArray(), idTransferTask_base::RequestType_Get, headers);
	connect(m_reply, SIGNAL(finished()), this, SLOT(finished_slot()));
	connect(m_reply, SIGNAL(readyRead()), this, SLOT(readyRead_slot()));
	connect(m_reply, SIGNAL(downloadProgress(qint64, qint64)), this, SLOT(updateProgress_slot(qint64, qint64)));
}

void idDownloadTask::Retransfer()
{
	Abort();

	SetStatus(idTransferTask_base::Status_Ready);

	Transfer();
}

void idDownloadTask::finished_slot()
{
	QNetworkReply *reply;
	int statusCode;
	bool redirect;
	QUrl url;

	redirect = false;
	reply = dynamic_cast<QNetworkReply *>(sender());
	if(reply != m_reply)
	{
		if(reply->isRunning())
			reply->abort();
		reply->deleteLater();
		return;
	}

	SetError(reply->error());
	if(reply->error() == QNetworkReply::NoError)
	{
		statusCode = reply->attribute(QNetworkRequest::HttpStatusCodeAttribute).toInt();
		if(statusCode == 302 || statusCode == 301) // redirection
		{
			url = reply->attribute(QNetworkRequest::RedirectionTargetAttribute).toUrl();
			qDebug() << "redirect -> " << url;
			if(!url.isValid())
			{
				SetProgress(0.0);
				m_file->flush();
				m_file->close();
				m_file->open(QIODevice::WriteOnly);
				m_file->resize(0);
				redirect = true;
			}
		}
		else
		{
			SetProgress(1.0);
		}
	}

	if(!redirect)
		End();
	else
	{
		m_reply->deleteLater();
		// if media is video, must add this header
		QMap<QByteArray, QByteArray> headers;
		headers.insert("Range", "bytes=0-");

		m_reply = Request(url.toString(), QByteArray(), idTransferTask_base::RequestType_Get, headers);
		connect(m_reply, SIGNAL(finished()), this, SLOT(finished_slot()));
		connect(m_reply, SIGNAL(readyRead()), this, SLOT(readyRead_slot()));
		connect(m_reply, SIGNAL(downloadProgress(qint64, qint64)), this, SLOT(updateProgress_slot(qint64, qint64)));
	}
}

void idDownloadTask::updateProgress_slot(qint64 bytes, qint64 total)
{
	QNetworkReply *reply;

	reply = dynamic_cast<QNetworkReply *>(sender());
	if(reply != m_reply)
	{
		if(reply->isRunning())
			reply->abort();
		reply->deleteLater();
		return;
	}

	if(bytes == 0 && total == 0)
		return;

	//qDebug()<<"D"<<bytes<<total;
	if(total > 0)
		SetProgress(qreal(bytes) / qreal(total));
	else
		SetProgress(0.0);
	SetReadBytes(bytes);
	SetTotalBytes(total);
}

void idDownloadTask::readyRead_slot()
{
	QNetworkReply *reply;
	int len;

	reply = dynamic_cast<QNetworkReply *>(sender());
	if(reply != m_reply)
	{
		if(reply->isRunning())
			reply->abort();
		reply->deleteLater();
		return;
	}

	if(reply->error() == QNetworkReply::NoError && m_file->isOpen())
	{
		QByteArray data = reply->readAll();
		len = m_file->write(data);
		if(len != data.size())
		{
			SetError(-1);
			End();
		}
	}
}

bool idDownloadTask::Begin()
{
	QNetworkReply *reply;

	if(m_remoteUrl.isEmpty() || m_filePath.isEmpty())
		return false;
	if(m_status != idTransferTask_base::Status_Ready)
		return false;
	if(m_file)
	{
		if(m_file->isOpen())
			m_file->close();
	}
	else
		m_file = new QFile;
	m_file->setFileName(m_filePath);
	if(!m_file->open(QIODevice::WriteOnly))
	{
		delete m_file;
		m_file = 0;
		return false;
	}
	if(m_file->exists())
		m_file->resize(0);
	if(m_reply)
	{
		reply = m_reply;
		m_reply = 0;
		if(reply->isRunning())
			reply->abort();
		reply->deleteLater();
	}
	qDebug() << "[Debug]: Begin download: " << m_remoteUrl << " -> " << m_msgId;
	return true;
}

void idDownloadTask::End()
{
	QNetworkReply *reply;

	if(m_file)
	{
		m_file->flush();
		m_file->close();
		delete m_file;
		m_file = 0;
	}
	if(m_reply)
	{
		reply = m_reply;
		m_reply = 0;
		if(reply->isRunning())
			reply->abort();
		reply->deleteLater();
	}

	SetStatus(m_error == 0 ? idTransferTask_base::Status_Done : idTransferTask_base::Status_Error);
	emit finished(m_error);

	qDebug() << "[Debug]: End download: " << m_filePath << " -> " << (m_error == 0 ? "success" : "error");
}

