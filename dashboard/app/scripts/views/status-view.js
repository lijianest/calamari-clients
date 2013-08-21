/*global define*/
/* jshint -W106, -W069*/
define(['jquery', 'underscore', 'backbone', 'templates', 'humanize', 'helpers/animation', 'marionette'], function($, _, Backbone, JST, humanize, animation) {
    'use strict';

    return Backbone.Marionette.ItemView.extend({
        className: 'gauge card span6 status',
        template: JST['app/scripts/templates/status.ejs'],
        statusTemplate: JST['app/scripts/templates/status-icon.ejs'],
        title: 'status',
        timer: null,
        ui: {
            cardTitle: '.card-title',
            subText: '.subtext',
            monstatus: '.mon-status',
            pgstate: '.pg-status',
            okosd: '.ok-osd',
            warnosd: '.warn-osd',
            failosd: '.fail-osd',
            okpool: '.ok-pool',
            warnpool: '.warn-pool',
            failpool: '.fail-pool',
            okmds: '.ok-mds',
            warnmds: '.warn-mds',
            failmds: '.fail-mds',
            okpg: '.ok-pg',
            warnpg: '.warn-pg',
            failpg: '.fail-pg',
            okmon: '.ok-mon',
            warnmon: '.warn-mon',
            failmon: '.fail-mon',
            spinner: '.icon-spinner'
        },
        modelEvents: {
            'change': 'updateView'
        },
        serializeData: function() {
            return {
                title: this.title,
                relTime: humanize.relativeTime(Date.now() / 1000)
            };
        },
        initialize: function(options) {
            this.disappearAnimation = animation.single('fadeOutUpAnim');
            this.reappearAnimation = animation.single('fadeInDownAnim');
            _.bindAll(this, 'updateView', 'set', 'updateTimer', 'disappear', 'disappearAnimation', 'reappearAnimation', 'reappear');

            // The are defaults for Gauge.js and can be overidden from the contructor
            this.App = Backbone.Marionette.getOption(this, 'App');
            if (this.App) {
                this.listenTo(this.App.vent, 'status:update', this.set);
                this.listenTo(this.App.vent, 'gauges:disappear', this.disappear);
                this.listenTo(this.App.vent, 'gauges:reappear', this.reappear);
                this.listenTo(this.App.vent, 'gauges:expand', this.expand);
                this.listenTo(this.App.vent, 'gauges:collapse', this.collapse);
            }
            if (options && options.App !== undefined) {
                this.App = options.App;
            }
            if (this.App && !this.App.Config['offline']) {
                /* Placeholder */
            }
            var self = this;
            this.listenToOnce(this, 'render', function() {
                self.listenTo(self.App.vent, 'status:request', function() {
                    self.ui.spinner.css('visibility', 'visible');
                });
                self.listenTo(self.App.vent, 'status:sync status:error', function() {
                    self.ui.spinner.css('visibility', 'hidden');
                });
                if (self.timer === null) {
                    self.updateTimer();
                }
            });
            this.formatPGWarn = this.formatStatus('PG Warn Status', 'icon-info warn');
            this.formatPGStates = this.formatStates('PGs');
            this.formatPGCrit = this.formatStatus('PG Critical Status', 'icon-info fail');
            this.formatPGStates = this.formatStates('PGs');
        },
        set: function(model) {
            this.model.set(model.attributes);
        },
        updateTimer: function() {
            this.ui.subText.text(humanize.relativeTime(this.model.get('added_ms') / 1000));
            this.timer = setTimeout(this.updateTimer, 1000);
        },
        updateView: function(model) {
            var attr = model.attributes;
            this.ui.okosd.text(attr.osd['up_in']);
            this.ui.warnosd.text(attr.osd['up_not_in']);
            this.ui.failosd.text(attr.osd['not_up_not_in']);
            this.ui.okmon.text(attr.mon['in_quorum']);
            this.ui.failmon.text(attr.mon['not_in_quorum']);
            var pg = model.getPGCounts();
            this.ui.okpg.text(pg.ok);
            this.ui.warnpg.text(pg.warn);
            this.ui.failpg.text(pg.critical);
            this.ui.subText.text(humanize.relativeTime(attr.added_ms / 1000));
            (function(self) {
                // yield this it's not urgent
                setTimeout(function() {
                    self.addPGStateInfo.call(self, model.getPGStates());
                }, 0);
            })(this);

        },
        // add pgstate info to ui
        addPGStateInfo: function(pgstate) {
            var pgstateHtml = [],
                pgSelectors = [];
            if (_.keys(pgstate.warn).length) {
                pgstateHtml.push(this.formatPGWarn(this.formatPGStates(pgstate.warn)));
                pgSelectors.push('.warn');
            }
            if (_.keys(pgstate.crit).length) {
                pgstateHtml.push(this.formatPGCrit(this.formatPGStates(pgstate.crit)));
                pgSelectors.push('.fail');
            }
            this.ui.pgstate.html(pgstateHtml.join(''));
            _.each(pgSelectors, function(selector) {
                this.ui.pgstate.find(selector).popover();
            });
        },
        // uses partial application to format state strings for display
        formatStates: function(entity) {
            return function(states) {
                return _.reduce(_.map(states, function(value, key) {
                    return value + ' ' + entity + ' ' + key;
                }), function(memo, string) {
                    return memo + ', ' + string;
                }, '');
            };
        },
        // uses partial application function to create
        // markup/configuration for state popover
        formatStatus: function(title, iconClass) {
            return function(status) {
                return this.statusTemplate({
                    iconClass: iconClass,
                    content: status,
                    title: title
                });
            };
        },
        disappear: function(callback) {
            return this.disappearAnimation(this.$el, function() {
                this.$el.css('visibility', 'hidden');
            }).then(function() {
                if (callback) {
                    callback.apply(this);
                }
            });
        },
        reappear: function(callback) {
            this.$el.css('visibility', 'visible');
            return this.reappearAnimation(this.$el, callback);
        },
        expand: function(callback) {
            this.$el.css('display', 'block');
            if (callback) {
                callback.apply(this);
            }
        },
        collapse: function(callback) {
            this.$el.css('display', 'none');
            if (callback) {
                callback.apply(this);
            }
        }
    });
});
