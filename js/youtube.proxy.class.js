
    /*==============================================
    // YOUTUBE PROXY CLASS
    //==============================================*/

    /**
     * @class YouTubeProxy
     * Allows embedding YouTube videos in iOS applications via a proxy iframe.
     * This specifically addresses wep apps wrapped in iOS that have issues with
     * origin referrers when loading YouTube iframes directly.
     * 
     * @param {string} containerID - The ID of the container element for the iframe.
     * @param {Object} args - Configuration options.
     * @param {string} args.width - Width of the iframe (default: '100%').
     * @param {string} args.height - Height of the iframe (default: '100%').
     * @param {string} args.proxyURL - URL of the YouTube proxy page.
     * @param {string} args.appOrigin - Origin of the parent application.
     * @param {string} args.webOrigin - Origin of the web application / proxy.
     * @param {string} args.videoId - YouTube video ID to load.
     * @param {Object} args.playerVars - YouTube player variables.
     * @param {Object} args.events - Event callbacks (onReady, onStateChange, onError, onProxyError).
     * @param {number} args.notifyThrottle - Throttle time for postMessage notifications (default: 10ms).
     */

    class YouTubeProxy{

        /*==============================================
        // CONSTRUCTOR
        //==============================================*/

        constructor(containerID, args){

            this.iframe      = null;

            this.containerID = containerID;
            this.width       = args.width      || '100%';
            this.height      = args.height     || '100%';
            this.proxyURL    = args.proxyURL   || '';
            this.webOrigin   = args.webOrigin  || '';
            this.appOrigin   = args.appOrigin  || '';
            this.videoId     = args.videoId    || '';
            this.playerVars  = args.playerVars || {};
            this.events      = args.events     || {};


            this.webOrigin   = this.stripOrigin(this.webOrigin);
            this.appOrigin   = this.stripOrigin(this.appOrigin);

            this.duration    = 0;
            this.currentTime = 0;

            this.notifyThrottle = args.notifyThrottle || 5;
            this.notifyTimeout  = {};

            this.build();

            this.didResponse = false;

        }


        stripOrigin(url){

            if (!url || url == '*'){
                return '*';
            }

            /* Url must only be protocol and host i.e https://example.com */

            let protocal = url.split('://')[0];
            let host     = url.split('://')[1].split('/')[0];

            return `${protocal}://${host}`;


        }

        /*==============================================
        // METHODS
        //==============================================*/

        /**
         * @method
         * Builds the iframe and sets up communication.
         */

        build(){

            document.getElementById(this.containerID).innerHTML = `<iframe id="${this.containerID}-youtube-iframe" scrolling="no" width="${this.width}" height="${this.height}" style="border:none; width:${this.width}; height:${this.height}; display:block" frameborder="0"></iframe>`;

            this.iframe = document.getElementById(`${this.containerID}-youtube-iframe`);

            
            this.subscribe();

            let payload = {
                videoId    : this.videoId,
                playerVars : this.playerVars,
                width      : this.width,
                height     : this.height,
                webOrigin  : this.webOrigin,
                appOrigin  : this.appOrigin
            }

            this.iframe.src = `${this.proxyURL}?payload=${btoa(JSON.stringify(payload))}`;

            this.notify('loadVideoById',this.playerVars);
            

        }


        /**
         * @method
         * Seeks to a specific time in the video.
         * @param {number} time 
         * @param {boolean} allowSeekAhead 
         */

        seekTo(time, allowSeekAhead = true){

            this.notify('seekTo',{
                time           : time,
                allowSeekAhead : allowSeekAhead
            });

        }


        /**
         * @method
         * Plays the video.
         */

        playVideo(){

            this.notify('playVideo');

        }


        /**
         * @method
         * Stops the video.
         */

        stopVideo(){

            this.notify('stopVideo');

        }


        /**
         * @method
         * Pauses the video.
         */

        pauseVideo(){

            this.notify('pauseVideo');

        }


        /**
         * @method
         * Sets the volume of the video.
         * @param {number} volume 
         */

        setVolume(volume){

            this.notify('setVolume',{
                volume : volume
            });

        }


        /**
         * @method
         * Gets the duration of the video.
         * @returns {number}
         */

        getDuration(){
            return this.duration;
        }


        /**
         * @method
         * Gets the current playback time of the video.
         * @returns {number}
         */

        getCurrentTime(){
            return this.currentTime;
        }


        /**
         * @method
         * Loads a video by its YouTube ID.
         * @param {*} args 
         * @param {string} args.videoId 
         * @param {number} [args.startSeconds=0] 
         * @param {number} [args.endSeconds=null] 
         */

        loadVideoById({videoId, startSeconds = 0, endSeconds = null}){

            this.notify('loadVideoById',{
                videoId     : videoId,
                startSeconds: startSeconds,
                endSeconds  : endSeconds
            });

        }


        /**
         * @method
         * Sends a notification to the iframe via postMessage.
         * @param {string} type 
         * @param {*} args 
         */

        notify(type, args = {}){

            if (!this.iframe){
                return;
            }

            window.clearTimeout(this.notifyTimeout[type]);

            this.notifyTimeout[type] = window.setTimeout(() => {

                console.log('YouTubeProxy::notify',type,args);

                this.iframe.contentWindow.postMessage({
                    type : type,
                    args : args
                }, this.webOrigin);

            }, this.notifyThrottle);
        }

        
        /**
         * @method
         * Subscribes to messages from the iframe via postMessage.
         */

        subscribe(){

            window.addEventListener('message', (event) => {


                if (event.origin !== this.webOrigin) {
                    return;
                }

                

                switch(event.data.type){

                    case 'onProxyError':

                        if (typeof this.events.onProxyError === 'function'){
                            this.events.onProxyError(event.data.args);
                        }

                    break;

                    case 'onTimeUpdate':

                        this.duration    = event.data.args.duration;
                        this.currentTime = event.data.args.currentTime;

                    break;
                    
                    case 'onReady':

                        this.didResponse = true;

                        if (typeof this.events.onReady === 'function'){
                            this.events.onReady(event.data.args);
                        }

                    break;

                    case 'onStateChange' :

                        this.duration    = event.data.args.duration;
                        this.currentTime = event.data.args.currentTime;

                        if (typeof this.events.onStateChange === 'function'){
                            this.events.onStateChange(event.data.args);
                        }

                    break;

                    case 'onError':

                        if (typeof this.events.onError === 'function'){
                            this.events.onError(event.data.args);
                        }

                    break;

                }

            });

        }

    }
