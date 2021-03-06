define([
    //Commmon libraries
    'common',
    'ajax',
    'modules/userPrefs',
    //Vendor libraries
    'domReady',
    'bonzo',
    //Modules
    'modules/storage',
    'modules/detect',
    'modules/popular',
    'modules/related',
    'modules/router',
    'modules/images',
    'modules/navigation/top-stories',
    'modules/navigation/profile',
    'modules/navigation/sections',
    'modules/navigation/search',
    'modules/navigation/edition-switch',
    'modules/tabs',
    'modules/toggles',
    'modules/relativedates',
    'modules/analytics/clickstream',
    'modules/analytics/omniture',
    'modules/adverts/adverts',
    'modules/cookies',
    'modules/analytics/omnitureMedia',
    'modules/analytics/adverts',
    'modules/debug',
    'modules/experiments/ab',
    'modules/experiments/left-hand-card',
    'modules/swipe/swipenav',
    "modules/adverts/video",
    "modules/discussion/commentCount",
    "modules/lightbox-gallery",
    "modules/swipe/ears",
    "modules/swipe/bar"
], function (
    common,
    ajax,
    userPrefs,

    domReady,
    bonzo,

    storage,
    detect,
    popular,
    related,
    Router,
    Images,
    TopStories,
    Profile,
    Sections,
    Search,

    EditionSwitch,
    Tabs,
    Toggles,
    RelativeDates,
    Clickstream,
    Omniture,
    Adverts,
    Cookies,
    OmnitureMedia,
    AdvertsAnalytics,
    Debug,
    ab,
    LeftHandCard,
    swipeNav,
    VideoAdvert,
    CommentCount,
    LightboxGallery,
    ears,
    SwipeBar
) {

    var modules = {

        upgradeImages: function () {
            var images = new Images();
            common.mediator.on('page:common:ready', function(config, context) {
                images.upgrade(context);
            });
            common.mediator.on('fragment:ready:images', function(context) {
                images.upgrade(context);
            });
            common.mediator.on('modules:related:loaded', function(config, context) {
                images.upgrade(context);
            });
            common.mediator.on('modules:images:upgrade', function() {
                common.$g('body').addClass('images-upgraded');
            });
        },

        initialiseNavigation: function (config) {
            var toggles = new Toggles(),
                topStories = new TopStories(),
                sections = new Sections(config),
                search = new Search(config),
                editions = new EditionSwitch(),
                header = document.body,
                profile;

            if (config.switches.idProfileNavigation) {
                profile = new Profile(header, {
                    url: config.page.idUrl
                });
                profile.init();
            }

            sections.init(header);
            toggles.init(header);
            topStories.load(config, header);
            search.init(header);

            common.mediator.on('page:common:ready', function(){
                toggles.reset();
            });
        },

        transcludeRelated: function () {
            common.mediator.on("page:common:ready", function(config, context){
                related(config, context);
            });
        },

        transcludePopular: function () {
            common.mediator.on('page:common:ready', function(config, context) {
                if('abExpandableMostPopular' in config.switches && !config.switches.abExpandableMostPopular) {
                    popular(config, context);
                }
            });
        },

        showTabs: function() {
            var tabs = new Tabs();
            common.mediator.on('modules:popular:loaded', function(el) {
                tabs.init(el);
            });
        },

        showToggles: function() {
            var toggles = new Toggles();
            common.mediator.on('page:common:ready', function(config, context) {
                toggles.init(context);
            });
        },

        showRelativeDates: function () {
            var dates = RelativeDates;
            common.mediator.on('page:common:ready', function(config, context) {
                dates.init(context);
            });
            common.mediator.on('fragment:ready:dates', function(el) {
                dates.init(el);
            });
        },

        initClickstream: function () {
            var cs = new Clickstream({filter: ["a", "button"]});
        },

        transcludeCommentCounts: function () {
            common.mediator.on('page:common:ready', function(config, context) {
                CommentCount.init(context);
            });
        },

        initLightboxGalleries: function () {
            var thisPageId;
            common.mediator.on('page:common:ready', function(config, context) {
                var galleries = new LightboxGallery(config, context);
                thisPageId = config.page.pageId;
                galleries.init();
            });

            // Register as a page view if invoked from elsewhere than its gallery page (like a trailblock)
            common.mediator.on('module:lightbox-gallery:loaded', function(config, context) {
                if (thisPageId !== config.page.pageId) {
                    common.mediator.emit('page:common:deferred:loaded', config, context);
                }
            });
        },

        runAbTests: function () {
            common.mediator.on('page:common:ready', function(config, context) {
                ab.run(config, context);
            });
        },

        loadAnalytics: function () {
            var omniture = new Omniture();

            common.mediator.on('page:common:deferred:loaded:omniture', function(config, context) {
                omniture.go(config, function(){
                    // callback:

                    Array.prototype.forEach.call(context.getElementsByTagName("video"), function(video){
                        if (!bonzo(video).hasClass('tracking-applied')) {
                            bonzo(video).addClass('tracking-applied');
                            var v = new OmnitureMedia({
                                el: video,
                                config: config
                            }).init();
                        }
                    });

                    if (config.switches.adslotImpressionStats) {
                        var advertsAnalytics = new AdvertsAnalytics(config, context);
                    }
                });
            });

            common.mediator.on('page:common:deferred:loaded', function(config, context) {

                common.mediator.emit('page:common:deferred:loaded:omniture', config, context);

                require(config.page.ophanUrl, function (Ophan) {

                    if (!Ophan.isInitialised) {
                        Ophan.isInitialised = true;
                        Ophan.initLog();
                    }

                    Ophan.additionalViewData(function() {

                        var viewData = {};

                        var audsci = storage.get('gu.ads.audsci');
                        if (audsci) {
                            viewData.audsci_json = JSON.stringify(audsci);
                        }

                        var participations = ab.getParticipations(),
                            participationsKeys = Object.keys(participations);

                        if (participationsKeys.length > 0) {
                            var testData = participationsKeys.map(function(k) {
                                return { id: k, variant: participations[k].variant };
                            });
                            viewData.experiments_json = JSON.stringify(testData);
                        }



                        return viewData;
                    });

                    Ophan.sendLog(config.swipe ? config.swipe.referrer : undefined, true);
                });

            });

        },

        externalLinksCards: function (config) {
            common.mediator.on('page:article:ready', function(config, context) {
                if (config.switches && config.switches.externalLinksCards) {
                    var card = new LeftHandCard({
                        origin: 'all',
                        context: context
                    });
                }
            });
        },

        loadAdverts: function () {
            if (!userPrefs.isOff('adverts')){
                common.mediator.on('page:common:deferred:loaded', function(config, context) {
                    if (config.switches && config.switches.adverts && !config.page.blockAds) {
                        Adverts.init(config, context);
                    }
                });
                common.mediator.on('modules:adverts:docwrite:loaded', function(){
                    Adverts.loadAds();
                });
            }
        },

        loadVideoAdverts: function(config) {
            common.mediator.on('page:common:ready', function(config, context) {
                if(config.switches.videoAdverts && !config.page.blockAds) {
                    Array.prototype.forEach.call(context.querySelectorAll('video'), function(el) {
                        var support = detect.getVideoFormatSupport();
                        var a = new VideoAdvert({
                            el: el,
                            support: support,
                            config: config,
                            context: context
                        }).init(config.page);
                    });
                } else {
                    common.mediator.emit("video:ads:finished", config, context);
                }
            });
        },

        cleanupCookies: function() {
            Cookies.cleanUp(["mmcore.pd", "mmcore.srv", "mmid"]);
        },

        // opt-in to the responsive alpha
        optIn: function () {
            var countMeIn = /#countmein/.test(window.location.hash);
            if (countMeIn) {
                var expiryDays = 365;
                Cookies.add("GU_VIEW", "mobile", expiryDays);
                Cookies.add("GU_FACIA", 'true', expiryDays);
            }
        },

        displayReleaseMessage: function () {
            if (window.screen.width >= 600) {
                Array.prototype.forEach.call(document.querySelectorAll('.release-message'), function (el) {
                    el.className = el.className.replace('u-h', '');
                });
            }
        },
        
        initSwipe: function(config, contextHtml) {
            if (config.switches.swipeNav && detect.canSwipe() && !userPrefs.isOff('swipe') || userPrefs.isOn('swipe-dev')) {
                var swipe = swipeNav(config, contextHtml);

                common.mediator.on('module:swipenav:navigate:next', function(){ swipe.gotoNext(); });
                common.mediator.on('module:swipenav:navigate:prev', function(){ swipe.gotoPrev(); });
            } else {
                delete this.contextHtml;
                return;
            }
            if (config.switches.swipeNav && detect.canSwipe()) {
                bonzo(document.body).addClass('can-swipe');
                common.mediator.on('module:clickstream:click', function(clickSpec){
                    if (clickSpec.tag.indexOf('switch-swipe-on') > -1) {
                        userPrefs.switchOn('swipe');
                        window.location.reload();
                    }
                    else if (clickSpec.tag.indexOf('switch-swipe-off') > -1) {
                        userPrefs.switchOff('swipe');
                        window.location.reload();
                    }
                });
            }
        }
    };

    var deferrable = function (config, context) {
        var self = this;
        common.deferToLoadEvent(function() {
            if (!self.initialisedDeferred) {
                self.initialisedDeferred = true;
                modules.loadAdverts();
                if (!config.switches.analyticsOnDomReady) {
                    modules.loadAnalytics();
                }

                // TODO: make these run in event 'page:common:deferred:loaded'
                modules.cleanupCookies(context);
            }
            common.mediator.emit("page:common:deferred:loaded", config, context);
        });
    };

    var ready = function (config, context, contextHtml) {
        if (!this.initialised) {
            this.initialised = true;
            modules.upgradeImages();
            modules.showTabs();
            modules.showToggles();
            modules.runAbTests();
            modules.showRelativeDates();
            modules.transcludeRelated();
            modules.transcludePopular();
            modules.initialiseNavigation(config);
            modules.loadVideoAdverts(config);
            modules.initClickstream();
            if (config.switches.analyticsOnDomReady) {
                modules.loadAnalytics();
            }
            modules.initSwipe(config, contextHtml);
            modules.transcludeCommentCounts();
            modules.initLightboxGalleries();
            modules.optIn();
            modules.displayReleaseMessage();
            modules.externalLinksCards();
        }
        common.mediator.emit("page:common:ready", config, context);
    };

    var init = function (config, context, contextHtml) {
        ready(config, context, contextHtml);
        deferrable(config, context);
    };

    return {
        init: init
    };
});
