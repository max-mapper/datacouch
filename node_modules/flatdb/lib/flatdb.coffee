EventEmitter = require('events').EventEmitter
id = require './uniqid'
fs = require 'fs'
path = require 'path'
async = require 'async'
uniqid = new id()

class flatdb extends EventEmitter
    connected = false
    basePath = null
    content = null

    constructor : (dir = './database') ->
        basePath = dir
        that = @
        process.nextTick ->
            
            async.series
                one : (callback) ->
                    basePath = path.resolve basePath
                    callback null, null

                two : (callback) ->
                    path.exists basePath, (exists) ->
                        if !exists
                            callback 'The database path \'' + basePath + '\' don\'t exists.'
                        else
                            callback null, null

                three : (callback) ->
                    content = uniqid.gen()
                    fs.writeFile basePath + '/writetest', content, 'utf8', (err) ->
                        if err
                            callback 'Wasn\'t possible to write to the database \'' + basePath + '\''
                        else
                            callback null, null

                four : (callback) ->
                    fs.readFile basePath + '/writetest', 'utf8', (err, doc) ->
                        if err or doc != content
                            callback 'Wasn\'t possible to read from the database \'' + basePath + '\''
                        else
                            callback null, null

                five : (callback) ->
                    fs.unlink basePath + '/writetest', (err) ->
                        if err
                            callback 'It\'s not possible to delete files inside the database \'' + basePath + '\''
                        else
                            callback null, null

            , (err, res) ->
                if err
                    that.emit 'error', err
                else
                    connected = true
                    that.emit 'connect'

    save : (doc, callback) ->
        process.nextTick ->
            if !connected
                callback 'Your are not connected!', null
            else
                if typeof doc != 'object'
                    callback 'You need to provide a valid javascript object to be saved.'
                else
                    json = JSON.stringify doc
                    fs.writeFile basePath + '/' + uniqid.gen(), json, 'utf8', (err) ->
                        if err
                            callback 'Failed to save your json to the database', null
                        else
                            callback null, null
        @

    delete : (search, callback) ->
        that = @
        process.nextTick ->
            if !connected
                callback 'Your are not connected!', null
            else
                that.find search, (err, docs) ->
                    if docs
                        async.map docs, (file, cb) ->
                            fs.unlink basePath + '/' + file._id, (err) ->
                                cb null, null
                        , (err, doc) ->
                            callback null, null
                    else
                        callback null, null
        @

    find : (search, callback) ->
        process.nextTick ->
            if !connected
                callback 'Your are not connected!', null
            else
                found = {}
                fs.readdir basePath, (err, files) ->
                    async.mapSeries files, (file, ret) ->
                        fs.readFile basePath + '/' + file, 'utf8', (err, doc) ->                             
                            try
                                doc = JSON.parse doc
                            catch error
                                callback err, null

                            if typeof doc != 'undefined'
                                doc._id = file
                                append = true
                                for key, val of search
                                    if typeof doc[key] == 'undefined' or doc[key] != val
                                        append = false

                                if append
                                    ret null, doc
                                else
                                    ret null, null
                            else
                                ret null, null

                    , (err, docs) ->
                        ret = new Array
                        for val, key in docs
                            if val != null
                                ret.push docs[key]

                        callback null, ret
        @

    update : (search, replace, callback) ->
        that = @
        process.nextTick ->
            if !connected
                callback 'Your are not connected!', null
            else
                that.find search, (err, docs) ->
                    async.mapSeries docs, (doc, cb) ->
                        id = doc._id
                        delete doc._id
                        for key, val of replace
                            doc[key] = val

                        json = JSON.stringify doc
                        fs.writeFile basePath + '/' + id, json, 'utf8', (err) ->
                            cb null, null
                    , (err, docs) ->
                        callback err, docs
        @

module.exports = flatdb