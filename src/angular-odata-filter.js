(function() {
    "use strict";

    angular.module('com.mcgraphix.odata.filter', [

    ])
        .service('ODataFilter', ['ExpressionParser', function(ExpressionParser) {
            return {
                parse: function(filterString) {
                    if (!filterString || filterString === '') {
                        return null;
                    } else {
                        var result = ExpressionParser.parse(filterString);
                        //console.log(JSON.stringify(result, null, 3));
                        return result;
                    }
                },

                execute: function(object, filterString) {
                    throw new Error("Not implemented");
                }
            };
        }])

        .service('ExpressionParser', function() {

            function Expression() {
                this.subject = null;
                this.operator = null;
                this.value = null;
            }

            function CompositeExpression() {
                this.subExpressions = [];
            }

            function JoinTypeExpression(type) {
                this.type = type;
            }

            function compress(expression) {
                if (expression.subExpressions && expression.subExpressions.length === 1) {
                    var subExpression = expression.subExpressions[0];
                    expression.subject = subExpression.subject;
                    expression.operator = subExpression.operator;
                    expression.value = subExpression.value;

                    delete expression.subExpressions;

                    if(subExpression.subExpressions) {
                        subExpression.subExpressions.forEach(function(subSubExpression) {
                            compress(subSubExpression);
                        });
                    }

                } else if(expression.subExpressions) {
                    expression.subExpressions.forEach(function(subExpression) {
                       compress(subExpression);
                    });
                }

                return expression;
            }

            function parse(code) {
                var rootExpression = new CompositeExpression();

                var regex = /\s+/gim;
                code = code.replace(regex, " ");

                //To make parsing the parenthesis groups easier, we will remove any function calls, cache them for later,
                //and replace them with a placeholder prior to parsing.
                var functionCache = [];
                code = code.replace(/[startswith|substring|endswith|startswith|length|indexof|replace|tolower|toupper|trim|concat]\([^)]*\)/gi, function(match) {
                    var placeholder = '$$f' + functionCache.length;
                    functionCache.push(match);
                    return placeholder;
                });

                //stack of expression so we know where we are in the tree
                var currentExpressionStack = [];
                currentExpressionStack.push(rootExpression);

                //hold the current expression
                var currentPart = new Expression();

                //hold the text content of the condition
                var currentDetails = "";

                //flags for when we might be in 'and' or 'or' string
                var possibleJoinMode = false;
                var possibleJoinType = "";
                var inQuotes = false;
                //parse the string one char at a time

                function finishParsingExpression(idx) {
                    if (code.length > idx + 1 && (code.charAt(idx+1) == ")" || code.charAt(idx+1) == "(")) {
                        if (possibleJoinMode) {
                            possibleJoinMode = false;
                            currentDetails += possibleJoinType;
                            possibleJoinType = ""
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

                for (var i = 0; i< code.length; i++) {
                    var parenthetical = null;
                    var toAddTo = null;
                    try {

                        if(code.charAt(i) === "'" && !inQuotes) {
                            //when we hit a quote, we want to treat everything after it as part of that string
                            inQuotes = true;
                            currentDetails += code.charAt(i);


                        } else if (code.charAt(i) === "'" && inQuotes) {
                            //when we hit a closing quote, we want to stop treatiing everything after it as part of that string
                            inQuotes = false;
                            currentDetails += code.charAt(i);

                            finishParsingExpression(i);

                        } else if (inQuotes) {
                            //just add to the details since we are in quotes
                            currentDetails += code.charAt(i);
                        } else if (code.charAt(i) == "(") {
                            //starting a grouping

                                parenthetical = new CompositeExpression();
                                toAddTo = currentExpressionStack[currentExpressionStack.length - 1];
                                if (toAddTo.subExpressions) {
                                    toAddTo.subExpressions.push(parenthetical);
                                }

                                currentExpressionStack.push(parenthetical);


                        } else if (code.charAt(i) == ")") {
                            //ending a grouping
                            parenthetical = currentExpressionStack.pop();

                        } else {
                            //figure out if we have hit part of the string that is "and" or "or"
                            var joinToAdd  = null;

                            if (i > 0 && possibleJoinMode == false && code.charAt(i - 1) == " " && (code.charAt(i) == "a" || code.charAt(i) == "o")) {
                                possibleJoinMode = true;
                                possibleJoinType = code.charAt(i);
                            } else if (possibleJoinMode) {
                                if (("or".indexOf(possibleJoinType + code.charAt(i)) == 0) ||
                                    ("and".indexOf(possibleJoinType + code.charAt(i)) == 0)) {
                                    //still in possible join mode
                                    possibleJoinType += code.charAt(i);
                                } else if (possibleJoinType + code.charAt(i) == "or " ||
                                    possibleJoinType + code.charAt(i) == "and ") {

                                    //just ending join mode;
                                    //add the expression before th join
                                    if (currentDetails.trim() != "") {
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
                                    currentDetails += possibleJoinType + code.charAt(i);
                                    possibleJoinMode = false;
                                    possibleJoinType = "";
                                }
                            } else {
                                currentDetails += code.charAt(i);

                            }

                            finishParsingExpression(i);
                        }
                    } catch(e) {
                        console.log(e);
                        throw new Error("ExpressionParser was not able to parse your code. There was an error at character " + i +". Please be sure your " +
                            "parenthesis are correctly nested and that you are using single quotes for string literals.");
                    }
                }

                if (currentPart && currentDetails !== null && currentDetails !== "") {
                    parseDetails(currentDetails, currentPart, functionCache);
                    rootExpression.subExpressions.push(currentPart);
                }


                //if the root expression has only one child, we'll trim it off
                //TODO should we do this with all composite expressions?
                if (!rootExpression.condition && rootExpression.subExpressions.length === 1) {
                    rootExpression = rootExpression.subExpressions[0];
                }
                return compress(rootExpression);
            }

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

                    if (operator == "") {
                        switch(part.toUpperCase()) {
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
                        return functionCache[p1];
                    });
                }

                if (operator === '') {
                    expression.operator = 'eq';
                    expression.value = true;
                } else {
                    expression.operator = operator;
                    expression.value = valueParts.join(" ");
                    if (!expression.value.match(/\D/g)) {
                        expression.value = Number(expression.value);
                    }
                }

            }

            return {
                parse:parse
            };

        })
    ;
}());