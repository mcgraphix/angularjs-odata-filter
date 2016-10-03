(function () {
    "use strict";

    angular.module('com.mcgraphix.odata.filter', [])

    /**
     * Filter used to evaluate an odata filter expression against an object
     */
        .filter('OData', ['ODataEvaluator',  function(ODataEvaluator) {
            return function(objects, filterString) {
                //to avoid parsing the same string every time, we will parse it once and reuse it
                var filterGraph = ODataEvaluator.parse(filterString);
                return objects.filter(function(object) {
                    return filterGraph.evaluate(object);
                });
            };
        }])

        /**
         * Evaluates an OData filter expression against an object an returns a boolean indicating if it matches
         */
        .service('ODataEvaluator', ['ODataExpressionParser', function (ODataExpressionParser) {

            return {
                /**
                 * Parses an OData filter string and returns the JS object representation of nested
                 * Expressions
                 * @param filterString
                 * @returns {Expression}
                 */
                parse: function (filterString) {
                    if (!filterString || filterString === '') {
                        return null;
                    } else {
                        return ODataExpressionParser.parse(filterString);;
                    }
                },

                /**
                 * Executes a filter against an object and returns a boolean indicating whether it matched
                 * @param object
                 * @param filterString
                 */
                evaluate: function (object, filterString) {

                    var filterGraph = this.parse(filterString);

                    if (!filterGraph) {
                        throw new Error("No filter specified");
                    } else {
                        return filterGraph.evaluate(object);
                    }

                }
            };
        }])

        /**
         * Service for evaluating the various comparison operators
         */
        .service('ODataOperators', function () {
            return {
                'eq': function (a, b) {
                    return a === b;
                },
                'ne': function (a, b) {
                    return !this.eq(a, b);
                },
                'gt': function (a, b) {
                    return a > b;
                },
                'ge': function (a, b) {
                    return a >= b;
                },
                'lt': function (a, b) {
                    return !this.ge(a, b);
                },
                'le': function (a, b) {
                    return !this.gt(a, b);
                }
            };
        })

        /**
         * service for executing the supported functions in filters
         */
        .service('ODataFunctions', function () {
            return {
                'startswith': function (fullString, segment) {
                    return fullString.toString().indexOf(segment) === 0;
                },
                'substring': function (fullString, start, length) {
                    return fullString.toString().substr(start, length);
                },
                'endswith': function (fullString, segment) {
                    return fullString.toString().lastIndexOf(segment) === (fullString.toString().length - segment.toString().length)
                },
                'length': function (fullString) {
                    return fullString.toString().length;
                },
                'indexof': function (fullString, segment) {
                    return fullString.toString().indexOf(segment);
                },
                'replace': function (fullString, token, replacement) {
                    return fullString.toString().replace(token, replacement);
                },
                'tolower': function (fullString) {
                    return fullString.toString().toLowerCase();
                },
                'toupper': function (fullString) {
                    return fullString.toString().toUpperCase();
                },
                'trim': function (fullString) {
                    return fullString.toString().trim();
                },
                'concat': function () {
                    throw new Error("concat not implemented");
                }
            };
        })

        /**
         * The expression parser converts an OData filter string into an object graph
         */
        .service('ODataExpressionParser', ['ODataOperators', 'ODataFunctions', function (operators, functions) {

            /**
             * Helper for evaluating dot syntax against an object
             * @param object
             * @param prop
             * @param valIfUndefined
             * @returns {*}
             */
            function evaluateSelector(object, prop, /*optional*/ valIfUndefined) {
                var propsArray = prop.split(".");
                while (propsArray.length > 0) {
                    var currentProp = propsArray.shift();
                    if (object.hasOwnProperty(currentProp)) {
                        object = object[currentProp];
                    } else {
                        if (valIfUndefined) {
                            return valIfUndefined;
                        } else {
                            return undefined;
                        }
                    }
                }

                return object;
            }

            /**
             * returns true if all of the arguments are true
             * @param ... any number of arguments
             * @returns {boolean}
             */
            function allTrue() {
                for (var i = 0; i < arguments.length; i++) {
                    if (!arguments[i]) {
                        return false;
                    }
                }

                return true;
            }

            /**
             * returns true if any of the arguments are true
             * @param ... any number of arguments
             * @returns {boolean}
             */
            function anyTrue() {
                for (var i = 0; i < arguments.length; i++) {
                    if (arguments[i]) {
                        return true;
                    }
                }

                return false;
            }

            //Interfaces would be good here as both Expression and CompositeExpression
            //"implement" the same interface which has a method:  evaluation(object) : returns boolean;
            //basic leaf expression
            function Expression() {
                this.subjectIsFunction = false;
                this.subject = null;
                this.operator = null;
                this.value = null;
            }

            /**
             * Evaluates the expression against the object
             * @param object
             * @returns {boolean}
             */
            Expression.prototype.evaluate = function (object) {
                var testValue = '';
                var actualValue = '';

                //NOTE: nested functions aren't working yet
                if (this.subject.indexOf("(") > -1) {

                    var functionName = this.subject.substring(0, this.subject.indexOf('('));
                    var params = this.subject.substring(functionName.length + 1, this.subject.length - 1);

                    var paramsArray = params.split(',').map(function (param) {
                        param = param.trim();
                        if (param.charAt(0) === "'") {
                            param = param.substring(1, param.length - 2);
                        } else if (!param.match(/\D/g)) {
                            param = Number(param);
                        } else {
                            param = evaluateSelector(object, param);
                        }
                        return param;
                    });


                    actualValue = functions[functionName].apply(functions, paramsArray);
                } else {
                    actualValue = evaluateSelector(object, this.subject);
                }

                if (typeof this.value === 'number') {
                    testValue = this.value;
                } else if (this.value.charAt(0) === "'") {
                    testValue = this.value.substr(1, this.value.length - 2);
                } else {
                    testValue = evaluateSelector(object, this.value);
                }


                if (operators.hasOwnProperty(this.operator)) {
                    return operators[this.operator](actualValue, testValue);
                } else {
                    throw new Error('invalid operator: ' + this.operator);
                }

            };

            //a collection of n expressions separated by a JoinTypeExpression
            function CompositeExpression() {

                this.subExpressions = [];


            }

            /**
             * Adds a sub expression;
             * @param subExpression:Expression
             */
            CompositeExpression.prototype.add = function (subExpression) {
                this.subExpressions.push(subExpression);
            };

            /**
             * Evaluates the collection of subexpressions
             * @param target
             * @returns boolean;
             */
            CompositeExpression.prototype.evaluate = function (target) {

                //if there is only one subexpression, we can just evaluate it
                if (this.subExpressions.length === 1) {
                    return this.subExpressions.evaluate();
                }

                var childValues = [];
                var andFound = false;
                var orFound = false;
                this.subExpressions.forEach(function (expression, idx) {
                    if (!expression.hasOwnProperty('type')) {
                        childValues[idx] = expression.evaluate(target);
                    } else {
                        childValues[idx] = expression;
                        if (expression.type === 'or') {
                            orFound = true;
                        } else if (expression.type === 'and') {
                            andFound = true;
                        }

                    }
                });

                var result = false;
                var i;
                //unless we have a combination of 'ands' and 'ors', we can just loop through and verify
                if (andFound && !orFound) {
                    //all must be true
                    result = true;
                    for (i = 0; i < childValues.length; i++) {
                        if (childValues[i].type) {
                            //skip the joins - they are only used in combination mode
                        } else if (!childValues[i]) {
                            //dump out if any of them are false
                            result = false;
                            break;
                        }
                    }

                } else if (orFound && !andFound) {
                    //at least one must be true
                    result = false;
                    for (i = 0; i < this.subExpressions.length; i++) {
                        if (childValues[i].type) {
                            //skip the joins - they are only used in combination mode
                        } else if (childValues[i]) {
                            //dump out if any of them are true
                            result = true;
                            break;
                        }
                    }

                } else { //some of each
                    //basically what we will do here is group all consecutive 'anded' expressions
                    //into a group, then create an or group out of them and the 'or' items
                    //then check that at least one is true

                    var groups = [];
                    var currentGroup = [];

                    //collect up any 'anded' ones into groups
                    childValues.forEach(function (value) {
                        if (!value.type) {
                            currentGroup.push(value);
                        } else if (value.type === 'or') {
                            groups.push(currentGroup);
                            currentGroup = [];
                        }

                    });

                    //add the last one
                    groups.push(currentGroup);

                    //evaluate all of the groups
                    groups = groups.map(function (groupValues) {
                        return allTrue.apply(this, groupValues);
                    });

                    //then see if any of them are true
                    result = anyTrue.apply(this, groups);

                }

                return result;

            };

            //representation of a join ... "and" or "or"
            function JoinTypeExpression(type) {
                this.type = type;
            }


            /**
             * Parses this filter string into a graph of expression objects that can
             * be evaluated against an object later
             * @param filterString
             * @returns {CompositeExpression}
             */
            function parse(filterString) {
                var rootExpression = new CompositeExpression();

                var regex = /\s+/gim;//get rid of adjacent spaces
                filterString = filterString.replace(regex, " ");

                //To make parsing the parenthesis groups easier, we will remove any function calls, cache them for later,
                //and replace them with a placeholder prior to parsing.
                //TODO: this isn't a great way to do this as it won't work with nested functions such as:
                //startswith(toupper(name), 'FOO')
                var functionCache = [];
                filterString = filterString.replace(/[substring|endswith|startswith|length|indexof|replace|tolower|toupper|trim|concat]\([^)]*\)/gi, function (match) {
                    var placeholder = '$$f' + functionCache.length;
                    functionCache.push(match);
                    return placeholder;
                });

                //stack of expressions so we know where we are in the tree
                var currentExpressionStack = [];
                currentExpressionStack.push(rootExpression);

                //hold the current expression
                var currentPart = new Expression();

                //hold the text content of the condition
                var currentDetails = "";

                //flags for when we might be in 'and' or 'or' string
                var possibleJoinMode = false;
                var possibleJoinType = "";
                //flag for when we are parsing a string between quotes
                var inQuotes = false;


                //used when we are at the end of a parenthetical expression or right before the start of the next one
                function finishParsingExpression(idx) {
                    if (filterString.length > idx + 1 && (filterString.charAt(idx + 1) == ")" || filterString.charAt(idx + 1) == "(")) {
                        if (possibleJoinMode) {
                            possibleJoinMode = false;
                            currentDetails += possibleJoinType;
                            possibleJoinType = "";
                        }
                        parseDetails(currentDetails, currentPart, functionCache);
                        toAddTo = currentExpressionStack[currentExpressionStack.length - 1];
                        if (toAddTo.subExpressions) {
                            toAddTo.subExpressions.push(currentPart);
                        }
                        currentDetails = "";
                        currentPart = new Expression();
                    }
                }

                //parse the string one char at a time
                for (var i = 0; i < filterString.length; i++) {
                    var parenthetical = null;
                    var toAddTo = null;
                    try {

                        if (filterString.charAt(i) === "'" && !inQuotes) {
                            //when we hit a quote, we want to treat everything after it as part of that string
                            inQuotes = true;
                            currentDetails += filterString.charAt(i);


                        } else if (filterString.charAt(i) === "'" && inQuotes) {
                            //when we hit a closing quote, we want to stop treating everything after it as part of that string
                            inQuotes = false;
                            currentDetails += filterString.charAt(i);

                            finishParsingExpression(i);

                        } else if (inQuotes) {
                            //just add to the details since we are in quotes
                            currentDetails += filterString.charAt(i);
                        } else if (filterString.charAt(i) == "(") {
                            //starting a grouping

                            parenthetical = new CompositeExpression();
                            toAddTo = currentExpressionStack[currentExpressionStack.length - 1];
                            if (toAddTo.subExpressions) {
                                toAddTo.subExpressions.push(parenthetical);
                            }

                            currentExpressionStack.push(parenthetical);


                        } else if (filterString.charAt(i) == ")") {
                            //ending a grouping
                            parenthetical = currentExpressionStack.pop();

                        } else {
                            //figure out if we have hit part of the string that is "and" or "or"
                            var joinToAdd = null;

                            if (i > 0 && possibleJoinMode === false && filterString.charAt(i - 1) === " " && (filterString.charAt(i) === "a" || filterString.charAt(i) === "o")) {
                                possibleJoinMode = true;
                                possibleJoinType = filterString.charAt(i);
                            } else if (possibleJoinMode) {
                                if (("or".indexOf(possibleJoinType + filterString.charAt(i)) === 0) ||
                                    ("and".indexOf(possibleJoinType + filterString.charAt(i)) === 0)) {
                                    //still in possible join mode
                                    possibleJoinType += filterString.charAt(i);
                                } else if (possibleJoinType + filterString.charAt(i) == "or " ||
                                    possibleJoinType + filterString.charAt(i) == "and ") {

                                    //just ending join mode;
                                    //add the expression before th join
                                    if (currentDetails.trim() !== "") {
                                        parseDetails(currentDetails, currentPart, functionCache);
                                        toAddTo = currentExpressionStack[currentExpressionStack.length - 1];
                                        if (toAddTo.subExpressions) {
                                            toAddTo.subExpressions.push(currentPart);
                                        }
                                    }
                                    currentDetails = "";
                                    currentPart = new Expression();
                                    //add the join
                                    joinToAdd = new JoinTypeExpression(possibleJoinType);
                                    toAddTo = currentExpressionStack[currentExpressionStack.length - 1];
                                    if (toAddTo.subExpressions) {
                                        toAddTo.subExpressions.push(joinToAdd);
                                    }
                                    possibleJoinMode = false;
                                    possibleJoinType = "";

                                    continue;
                                } else {
                                    currentDetails += possibleJoinType + filterString.charAt(i);
                                    possibleJoinMode = false;
                                    possibleJoinType = "";
                                }
                            } else {
                                currentDetails += filterString.charAt(i);

                            }

                            finishParsingExpression(i);
                        }
                    } catch (e) {
                        console.log(e);
                        throw new Error("ODataExpressionParser was not able to parse your filter string. There was an error at character " + i + ". Please be sure your " +
                            "parenthesis are correctly nested and that you are using single quotes for string literals.");
                    }
                }

                if (currentPart && currentDetails !== null && currentDetails !== "") {
                    parseDetails(currentDetails, currentPart, functionCache);
                    rootExpression.subExpressions.push(currentPart);
                }


                //if the root expression has only one child, we'll trim it off
                if (!rootExpression.condition && rootExpression.subExpressions.length === 1) {
                    rootExpression = rootExpression.subExpressions[0];
                }

                return rootExpression;
            }

            /**
             * Parse the contents of an expression (the part with a subject, operator and value)
             * and update the expression with it
             * @param val
             * @param expression
             * @param functionCache
             */
            function parseDetails(val, expression, functionCache) {
                var regex = /\bnot\s+?in\b/gim;
                val = val.replace(regex, "notIn");

                regex = /\bis\s+?not\b/gim;
                val = val.replace(regex, "isNot");

                val = val.trim();
                var detailsParts = val.split(" ");

                var propertyParts = [];
                var operator = "";
                var valueParts = [];

                var inQuotes = false;

                for (var i = 0; i < detailsParts.length; i++) {
                    var part = detailsParts[i];

                    if (part.charAt(0) === "'") {
                        inQuotes = true;

                    }

                    if (inQuotes && part.charAt(part.length - 1) === "'") {
                        inQuotes = false;
                    }

                    if (operator === "") {
                        switch (part.toUpperCase()) {
                            case "NOT":
                            /*falls-through*/
                            case "EQ":
                            /*falls-through*/
                            case "NE":
                            /*falls-through*/
                            case "GT":
                            /*falls-through*/
                            case "LT":
                            /*falls-through*/
                            case "LE":
                            /*falls-through*/
                            case "GE":
                                operator = part;
                                break;
                            /* case "notIn": //TODO Does OData support this kind of thing?
                             case "in":
                             case "isNot":
                             case "is":
                             if (inQuotes) {
                             propertyParts.push(part);
                             } else {
                             operator = part;
                             }
                             break;*/
                            default:
                                propertyParts.push(part);
                        }
                    } else {
                        valueParts.push(part);
                    }

                }


                expression.subject = propertyParts.join(" ");

                //if there was a function used, then we need to put it back
                if (expression.subject.indexOf('$$f') > -1) {
                    expression.subject = expression.subject.replace(/\$\$f(\d*)/g, function (match, p1) {
                        expression.subjectIsFunction = true;
                        return functionCache[p1];
                    });
                }

                //when there is no operator it is a function call that returns a boolean
                //so we will automatically add the operator and value;
                if (operator === '') {
                    expression.operator = 'eq';
                    expression.value = true;
                } else {
                    expression.operator = operator;
                    expression.value = valueParts.join(" ");
                    //numbers should be returned as actual numbers
                    if (!expression.value.match(/\D/g)) {
                        expression.value = Number(expression.value);
                    }
                }
            }

            //expose the public method
            return {
                parse: parse
            };

        }])
    ;
}());