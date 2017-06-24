(function() {
    'use strict';
    var root,
        isNode = false,
        _ = null,
        watcher = {},
        watcherUtil = {},
        _queue = [],
        WatchItem,
        WatchEvent,
        _interval = null,
        calculateInterval,
        hwndTimer = null,
        intervalChange,
        stopTimer,
        startTimer,
        STATES = {
            SUPPORTED: 1,
            WATCH_ITEM_MISSING: 2,
            EVENT_CALLBACK_MISSING: 3,
            NOT_SUPPORTED: 4,
            COMPARATOR_REQUIRED: 5,
            DEEP_CHECKING_NEEDED: 6
        },
        executor;

    _interval = 200;
    watcher.RESPONSE_STATES = STATES;

    if(typeof window==='object' && typeof window.window==='object' && typeof window.navigator==='object') {
        root = window;
        _ = root._ ? root._ : null;
        root.SingletonWatcher = watcher;
    } else if(typeof module !== 'undefined' && module.exports) {
        root = global;
        _ = require('underscore');
        module.exports = watcher;
        isNode = true;
    } else {
        throw("Unsupported Environment")
    }

    calculateInterval = function() {
    };

    watcher.addWatch = function(toWatch, config) {
        var watchType = typeof toWatch,
            eventCallback = watcherUtil.isFunction(config) ? config : (config && watcherUtil.isFunction(config.event) ? config.event : null),
            response = {
                status: false
            },
            _config = watcherUtil.isObject(config) ? config : {},
            objectMonitor = _config.objectMonitor ? _config.objectMonitor : root,
            eventProxy = watcherUtil.isObject(_config.proxy) ? _config.proxy : (_config.proxy ? false : root),
            args = watcherUtil.isArray(_config.args) ? _config.args : (watcherUtil.isUndefined(_config.args) ? [] : [_config.args]),
            deep =!!config &&  !!config.deep,
            compare = _config.compare ? _config.compare : function(newVal, oldVal) {
                return watcherUtil.compare(newVal, oldVal, deep);
            },
            firstInitVal,
            _getInitVal,
            _getCurrentVal,
            _triggerEvent,
            watchItem;

        if (watcherUtil.isUndefined(toWatch)) {
            response.state = STATES.WATCH_ITEM_MISSING;
        } else if (!eventCallback) {
            response.state = STATES.EVENT_CALLBACK_MISSING;
            return response;
        }
        _triggerEvent = function(eventArgs) {
            var _eventArgs = watcherUtil.isArray(eventArgs) ? eventArgs :
                (watcherUtil.isObject(eventArgs) ? [eventArgs] : []);
            setTimeout(function() {
                var proxy = eventProxy ? eventProxy : _getCurrentVal();
                eventCallback.apply(proxy, _eventArgs);
            }, 0);
        };

        switch (watchType) {
            case 'function':
                _getCurrentVal = function() {
                    return toWatch.apply(objectMonitor, args);
                };
                _getInitVal = function() {
                    var val = toWatch.apply(objectMonitor, args);
                    return watcherUtil.isObject(val) && deep ? watcherUtil.clone(val) : val;
                };
                break;
            case 'object':
                _getCurrentVal = function() {
                    return toWatch;
                };
                _getInitVal = function() {
                    return watcherUtil.clone(toWatch);
                };
                if (!(watcherUtil.canDeepCheck() || watcherUtil.isFunction(_config.compare))) {
                    response.state = STATES.COMPARATOR_REQUIRED;
                    return response;
                }
                deep = true;
                break;
            default:
                response.status = false;
                response.state = STATES.NOT_SUPPORTED;
        }
        firstInitVal = _getInitVal();
        if (watcherUtil.isObject(firstInitVal) && deep && !(watcherUtil.canDeepCheck() || watcherUtil.isFunction(_config.compare))) {
            response.state = STATES.COMPARATOR_REQUIRED;
            return response;
        }
        watchItem = new WatchItem(toWatch, firstInitVal, _getInitVal, _getCurrentVal, compare, _triggerEvent);
        _queue.push(watchItem);
        response.status = true;
        response.state = STATES.SUPPORTED;
        response.id = watchItem.id;
        if (_queue.length === 1) {
            startTimer();
        }
        return response;
    };

    watcher.removeWatch = function(toWatchOrId) {
        var idx, watchItem;
        for (idx = 0; idx < _queue.length; idx++) {
            watchItem = _queue[idx];
            if (watchItem.isSourceFrom(toWatchOrId)) {
                _queue.splice(idx, 1);
                if (_queue.length === 0) {
                    stopTimer();
                }
                return true;
            }
        }
        return false;
    };

    WatchItem = function(source, firstInitVal, getInitVal, getCurrentVal, compare, triggerEvent) {
        if (watcherUtil.isUndefined(this.constructor.uniqIdCounter)) {
            this.constructor.uniqIdCounter = 0;
        }
        this.id = ++this.constructor.uniqIdCounter;
        this.lastVal = firstInitVal;
        this.getInitVal = getInitVal;
        this.getCurrentVal = getCurrentVal;
        this.compare = compare;
        this.triggerEvent = triggerEvent;
        this.isChanged = function() {
            return !compare(this.lastVal, this.getCurrentVal());
        };
        this.resetLastVal = function() {
            this.lastVal = this.getInitVal();
        };
        this.isSourceFrom = function(sourceCheck) {
            sourceCheck = typeof sourceCheck === 'string' ? parseInt(sourceCheck) : sourceCheck;
            return (watcherUtil.isObject(sourceCheck) ? sourceCheck.id : sourceCheck) === this.id;
        }
    };

    executor = function() {
        _queue.forEach(function(item) {
            try {
                if (item.isChanged()) {
                    var lastVal = item.lastVal,
                        val = item.getCurrentVal(),
                    event = new WatchEvent(lastVal, val, item.id);
                    item.triggerEvent(event);
                    item.resetLastVal();
                }
            } catch (e) {
                root.console.log('Exception: ', e);
            }
        });
    };

    stopTimer = function() {
        if (hwndTimer !== null) {
            root.clearInterval(hwndTimer);
            hwndTimer = null;
        }
    };
    startTimer = function() {
        if (hwndTimer !== null) {
            stopTimer();
        }
        hwndTimer = root.setInterval(executor, _interval);
    }

    /*Watcher Event*/
    WatchEvent = function(lastVal, val, id) {
        this.lastVal = lastVal;
        this.val = val;
        this.id = id;
    };


    /*Watcher Utils*/

    watcherUtil.clone = function(toClone) {
        if (this.isUndefined(toClone)) {
            return undefined;
        } else if (watcherUtil.isArray(toClone)) {
            return Array.from(toClone);
        } else if (watcherUtil.isObject(toClone)) {
            return _ ? _.clone(toClone) : Object.assign({}, toClone);
        } else {
            return toClone;
        }
    };
    watcherUtil.isUndefined = function(item) {
        return (typeof item === 'undefined');
    }
    watcherUtil.isFunction = function(item) {
        return (typeof item === 'function')
    }
    watcherUtil.isObject = function(item) {
        return (typeof item === 'object')
    }
    watcherUtil.isArray = Array.isArray;

    watcherUtil.canDeepCheck = function() {
        return !!_ && this.isFunction(_.isEqual);
    };
    watcherUtil.compare = function(newVal, oldVal, deep) {
        var _this = this,
            deepCompare = function(n, o) {
                if (!_this.canDeepCheck()) {
                    return true;
                } else {
                    return _.isEqual(n, o);
                }
            };

        if (!deep) {
            return newVal === oldVal;
        } else if (this.canDeepCheck()) {
            return deepCompare(newVal, oldVal);
        } else {
            return true;
        }
    };
})();