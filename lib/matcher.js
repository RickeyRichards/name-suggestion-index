// ES5 for iD, for now
var simplify = require('./simplify.js');
var toParts = require('./to_parts.js');

var matchGroups = require('../config/match_groups.json').matchGroups;


module.exports = function() {
    var _warnings = [];    // array of match conflict pairs
    var _ambiguous = {};
    var _matchIndex = {};
    var matcher = {};

    // Create an index of all the keys/simplenames for fast matching
    matcher.buildMatchIndex = function(brands) {
        Object.keys(brands).forEach(function(kvnd) {
            var obj = brands[kvnd];
            var parts = toParts(kvnd);

            var matchTags = (obj.matchTags || [])
                .map(function(s) { return s.toLowerCase(); });
            var matchNames = (obj.matchNames || [])
                .map(simplify);
            var nomatches = (obj.nomatch || [])
                .map(function(kvnd) { return toParts(kvnd).kvnsimple; });

            var match_kv = [parts.kv].concat(matchTags);
            var match_nsimple = [parts.nsimple].concat(matchNames);

            match_kv.forEach(function(kv) {
                match_nsimple.forEach(function(nsimple) {
                    var test = kv + nsimple;
                    if (nomatches.some(function(s) { return s === test; })) {
                        console.log('WARNING match/nomatch conflict for ' + test);
                        return;
                    }

                    if (parts.d) {
                        // fixme: duplicates will overwrite the single entry (ok for now)
                        if (!_ambiguous[kv]) _ambiguous[kv] = {};
                        _ambiguous[kv][nsimple] = parts;
                    } else {
                        // duplicates are a problem in matchIndex, warn if we detect it
                        if (!_matchIndex[kv]) _matchIndex[kv] = {};
                        var m = _matchIndex[kv][nsimple];
                        if (m) {  // there already is a match for this
                            _warnings.push([m.kvnd, kvnd + ' ("' + nsimple + '")']);
                        } else {
                            _matchIndex[kv][nsimple] = parts;
                        }
                    }
                });
            });
        });
    };


    // pass a `key`, `value`, `name` and return the best match
    matcher.matchKVN = function(key, value, name) {
        return matcher.matchParts(toParts(key + '/' + value + '|' + name));
    };

    // pass a parts object and return the best match
    matcher.matchParts = function(parts) {
        var match = null;
        var inGroup = false;

        // fixme: we currently return a single match for ambiguous
        match = _ambiguous[parts.kv] && _ambiguous[parts.kv][parts.nsimple];
        if (match) return match;

        // try to return an exact match
        match = _matchIndex[parts.kv] && _matchIndex[parts.kv][parts.nsimple];
        if (match) return match;

        // look in match groups
        for (var mg in matchGroups) {
            var matchGroup = matchGroups[mg];
            match = null;
            inGroup = false;

            for (var i = 0; i < matchGroup.length; i++) {
                var otherkv = matchGroup[i].toLowerCase();
                if (!inGroup) {
                    inGroup = (otherkv === parts.kv);
                }
                if (!match) {
                    // fixme: we currently return a single match for ambiguous
                    match = _ambiguous[otherkv] && _ambiguous[otherkv][parts.nsimple];
                }
                if (!match) {
                    match = _matchIndex[otherkv] && _matchIndex[otherkv][parts.nsimple];
                }

                if (inGroup && match) {
                    return match;
                }
            }
        }

        return null;
    };


    matcher.getWarnings = function() {
        return _warnings;
    };


    return matcher;
};
