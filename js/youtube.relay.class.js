    /*==============================================
    // YOUTUBE RELAY CLASS
    //==============================================*/

    /**
     * @class YouTubeRelay
     * Acts as a relay to load YouTube videos in an iframe via postMessage communication.
     */

    class YouTubeRelay{

        /*==============================================
        // CONSTRUCTOR
        //==============================================*/

        constructor(){

            let URLParams = new URLSearchParams(window.location.search);

            let payloadString = URLParams.get('payload') || '';

            let payload = JSON.parse(atob(payloadString));


            this.webOrigin = payload.webOrigin || '*';
            this.appOrigin = payload.appOrigin || '*';

            this.youtubePlayer = null;

            this.playing = false;

            this.subscribe();
            this.create(payload);

        }

        /*==============================================
        // METHODS
        //==============================================*/

        /**
         * @method
         * Subscribes to postMessage events from the parent window.
         */

        subscribe(){

            window.addEventListener('message', (event) => {
                

                if (event.origin !== this.appOrigin ) {
                    return;
                }

                switch(event.data.type){

                    case 'seekTo':

                        this.youtubePlayer.seekTo(event.data.args.time, event.data.args.allowSeekAhead);

                    break;

                    case 'playVideo':

                        this.youtubePlayer.playVideo();

                    break;

                    case 'stopVideo':

                        this.playing = false;

                        this.youtubePlayer.stopVideo();
                        
                    break;

                    case 'pauseVideo':

                        this.playing = false;

                        this.youtubePlayer.pauseVideo();

                    break;

                    case 'setVolume':

                        this.youtubePlayer.setVolume(event.data.args.volume);

                    break;

                    case 'loadVideoById':

                        //this.youtubePlayer.stopVideo();

                        let options = {};

                        if (event.data.args.videoId){
                            options.videoId = event.data.args.videoId;
                        }

                        if (event.data.args.startSeconds){
                            options.startSeconds = event.data.args.startSeconds;
                        }

                        if (event.data.args.endSeconds){
                            options.endSeconds = event.data.args.endSeconds;
                        }

                        console.log('Loading video by ID:', options);

                        this.youtubePlayer.loadVideoById(options);
                        

                        this.notify('onTimeUpdate',{
                            currentTime : this.youtubePlayer.getCurrentTime(),
                            duration    : this.youtubePlayer.getDuration()
                        });

                    break;

                }

            });

        }


        /**
         * @method
         * Notifies the parent window via postMessage.
         * @param {string} type 
         * @param {*} data 
         */

        notify(type, data){

            window.parent.postMessage({
                type: type,
                args: data
            }, this.appOrigin);

        }


        /**
         * @method
         * Loads the YouTube IFrame API script.
         * @returns {Promise}
         */

        loadDependency(){

            return new Promise((resolve, reject) => {

                let tag = document.createElement('script');
                tag.src = "https://www.youtube.com/iframe_api";
                
                tag.onload = _ => {
                    resolve();
                }

                tag.onerror = err => {
                    reject(err);
                }

                document.head.appendChild(tag);

            });

        }


        /**
         * @method
         * Creates the YouTube player.
         * @param {Object} args 
         * @param {string} args.videoId
         * @param {Object} args.playerVars
         * @param {number} args.width
         * @param {number} args.height
         * @param {string} args.origin
         */

        async create({videoId, playerVars, width, height, origin}){

            await this.loadDependency();

            if (typeof YT === 'undefined' || typeof YT.Player === 'undefined'){
                setTimeout(() => {
                    this.create({videoId, playerVars, width, height, origin});
                }, 100);
                return;
            }


            playerVars.origin = window.location.origin;

            this.youtubePlayer = new YT.Player('youtube-player', {
                height    : height,
                width     : width,
                videoId   : videoId,
                playerVars: playerVars,
                events    : {
                    onReady : (e) => {

                        this.notify('onReady',{data : e.data});

                    },
                    onStateChange : (e) => {


                        this.notify('onStateChange',{data : e.data});

                    },
                    onError : e => {

                        this.notify('onError',{data : e.data});

                    }
                }
            });


            /* Update time periodically when playing */
            setInterval(_ => {

                this.playing = [1].includes(this.youtubePlayer.getPlayerState());

                let display  = [1, 2, 3].includes(this.youtubePlayer.getPlayerState());


                document.getElementById('youtube-player').style.opacity = display ? '1' : '0';

                if (!this.playing){
                    return;
                }

                this.notify('onTimeUpdate',{
                    currentTime : this.youtubePlayer.getCurrentTime(),
                    duration    : this.youtubePlayer.getDuration()
                });

            }, 250);


        }


    }
