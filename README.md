#singleton-watcher

##Overview
This is a Non-native timer based watcher for any value. It will be usefull when the aim is to observe values for which there is no native support so far. For example if we want to watch height change of a particular DOM element that can be changed from anywhere. Note, If you are sure thatYou are using inline style/height attribute or changing the class from where the height is affecting then its better use MutationObserver or DOMSubtreeModified. Its is recomended to use this watcher when there is no native support for that event delegation. Using this watcher its possble
to watch any objects/array or any primitive value as well.

##Why preferred SingletonWatcher instead of manually start a timer (interval/timeout)
When you have to watch a value, and you don't have a native support, and you don't know the possible reasons of change as well,you could have start a recursive timeout or interval from your side. But the only different is in that case you need to manupulate theentire life cycle of that.and also if you want to watch multiple values, you will run multiple timers. Instead of that we tried to run a single timer (only when there is atleast 1item to watch) logically. and also provide the flexibility of event proxy object, custom comparator, remove of watcher(s) previously added and so on. We beleive that this logical layers can be written by you as well, but its just a step to reduce those work, and maintain a common library that will be shared across multiple projects, and this repo will be better day by day.

##How to use
As of now singleton-watcher is not an npm repo, we will plan for it. upto that period you can directly clone and host it with your app. and then simple add a script src to the singleton-watcher js file. Once added, you a refernce to this lib object as SingletonWatcher, and then check the followings

- `SingletonWatcher` comes with 2 methods, `addWatch(itemToWatch, eventCallback or Config)` and `rmoveWatch(watchItemId or itemToWatch)`