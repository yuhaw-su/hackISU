'use strict';

var modes = [
    "password",
    "lyric",
    ];

var currentMode = modes[0];
var password = "password";
var potentialPassword = null;
var newModeIndex = null;
var lyricList = [
    {
        file: "NeverGonnaGiveYouUp",
        lyric: "you know the rules and so do I"
    },
    {
        file: "UltralightBeam",
        lyric: "my daughter look just like Sia you can't see her"
    },
    {
        file: "HawaiianRollerCoasterRide",
        lyric: "than on a surfboard out at sea"
    },
    {
        file: "ForFree",
        lyric: "223,000 hours"
    },
    {
        file: "GoldDigger",
        lyric: "she got a baby by busta"
    }
    ];
var lyricIndex = 0;
var accessGranted = false;

// Route the incoming request based on type (LaunchRequest, IntentRequest,
// etc.) The JSON body of the request is provided in the event parameter.
exports.handler = function (event, context) {
    try {
        console.log("event.session.application.applicationId=" + event.session.application.applicationId);

        /**
         * Uncomment this if statement and populate with your skill's application ID to
         * prevent someone else from configuring a skill that sends requests to this function.
         */

//     if (event.session.application.applicationId !== "amzn1.echo-sdk-ams.app.05aecccb3-1461-48fb-a008-822ddrt6b516") {
//         context.fail("Invalid Application ID");
//      }

        if (event.session.new) {
            onSessionStarted({requestId: event.request.requestId}, event.session);
        }

        if (event.request.type === "LaunchRequest") {
            onLaunch(event.request,
                event.session,
                function callback(sessionAttributes, speechletResponse) {
                    context.succeed(buildResponse(sessionAttributes, speechletResponse));
                });
        } else if (event.request.type === "IntentRequest") {
            onIntent(event.request,
                event.session,
                function callback(sessionAttributes, speechletResponse) {
                    context.succeed(buildResponse(sessionAttributes, speechletResponse));
                });
        } else if (event.request.type === "SessionEndedRequest") {
            onSessionEnded(event.request, event.session);
            context.succeed();
        }
    } catch (e) {
        context.fail("Exception: " + e);
    }
};

/**
 * Called when the session starts.
 */
function onSessionStarted(sessionStartedRequest, session) {
    console.log("onSessionStarted requestId=" + sessionStartedRequest.requestId
        + ", sessionId=" + session.sessionId);

    accessGranted = false;
    potentialPassword = null;
    newModeIndex = null;
}

/**
 * Called when the user invokes the skill without specifying what they want.
 */
function onLaunch(launchRequest, session, callback) {
    console.log("onLaunch requestId=" + launchRequest.requestId
        + ", sessionId=" + session.sessionId);

    attemptAccess(session, callback);
}

/**
 * Called when the user specifies an intent for this skill.
 */
function onIntent(intentRequest, session, callback) {
    console.log("onIntent requestId=" + intentRequest.requestId
        + ", sessionId=" + session.sessionId);

    var intent = intentRequest.intent,
        intentName = intentRequest.intent.name;

    // dispatch custom intents to handlers here
    if ("ChangePasswordIntent" === intentName) {
        handleChangePasswordRequest(intent, session, callback);
    } else if ("ChangeModeIntent" === intentName) {
        handleChangeModeRequest(intent, session, callback);
    } else if ("AnswerOnlyIntent" === intentName) {
        handleAnswerRequest(intent, session, callback);
    } else if ("AMAZON.StartOverIntent" === intentName) {
        attemptAccess(session, callback);
    } else if ("AMAZON.RepeatIntent" === intentName) {
        handleRepeatRequest(intent, session, callback);
    } else if ("AMAZON.HelpIntent" === intentName) {
        handleGetHelpRequest(intent, session, callback);
    } else if ("AMAZON.StopIntent" === intentName) {
        handleFinishSessionRequest(intent, session, callback);
    } else if ("AMAZON.CancelIntent" === intentName) {
        handleFinishSessionRequest(intent, session, callback);
    } else {
        throw "Invalid intent";
    }
}

/**
 * Called when the user ends the session.
 * Is not called when the skill returns shouldEndSession=true.
 */
function onSessionEnded(sessionEndedRequest, session) {
    console.log("onSessionEnded requestId=" + sessionEndedRequest.requestId
        + ", sessionId=" + session.sessionId);

    accessGranted = false;
    potentialPassword = null;
    newModeIndex = null;
}

// ------- Skill specific business logic -------

var CARD_TITLE = "Major Key";

function attemptAccess(session, callback)
{

    var speechOutput = "";
    switch (currentMode)
    {
        case modes[0]:
            speechOutput = "What is the secret password?";
            break;
        case modes[1]:
            lyricIndex = Math.floor(Math.random() * lyricList.length);
            speechOutput = "<speak>Complete the lyric:"
                    + "<audio src='https://s3.amazonaws.com/low-key/" + lyricList[lyricIndex].file + ".mp3'/>"
                    + "</speak>";
            break;
    }
    var repromptText = "";
    var shouldEndSession = false;

    callback(session.attributes,
        buildSpeechletResponse(CARD_TITLE, speechOutput, repromptText, shouldEndSession));
}

function handleAnswerRequest(intent, session, callback) {
    var speechOutput = "";

    switch (currentMode)
    {
      case modes[0]:
        if (intent.slots.Answer.value == password) {
            accessGranted = true;
        }
        break;
      case modes[1]:
        if (intent.slots.Answer.value == lyricList[lyricIndex].lyric) {
            accessGranted = true;
        }
        break;
      default:
        console.log("shouldn't be here");
    }

    if (accessGranted)
    {
        if (potentialPassword !== null) // Making a new password
        {
            password = potentialPassword;
            speechOutput = "Your password has been changed to " + password + ".";
        }
        else if (newModeIndex !== null)   // Changing mode
        {
            currentMode = modes[newModeIndex];
            speechOutput = "Now using " + currentMode + " mode.";
        }
        else
        {
            //arduino shit
            speechOutput = "Access granted. Welcome!";
        }
    }
    else
    {
        speechOutput = "Access denied. Incorrect passcode.";
    }

    callback(session.attributes,
        buildSpeechletResponse(CARD_TITLE, speechOutput, "", true));
}

function handleChangePasswordRequest(intent, session, callback) {
    potentialPassword = intent.slots.Answer.value;

    attemptAccess(session, callback);
}

function handleChangeModeRequest(intent, session, callback) {
    newModeIndex = modes.indexOf(intent.slots.Mode.value);

    attemptAccess(session, callback);
}

function handleRepeatRequest(intent, session, callback) {
    // Repeat the previous speechOutput and repromptText from the session attributes if available
    // else start a new game session
    if (!session.attributes || !session.attributes.speechOutput) {
        attemptAccess(callback);
    } else {
        callback(session.attributes,
            buildSpeechletResponseWithoutCard(session.attributes.speechOutput, session.attributes.repromptText, false));
    }
}

function handleGetHelpRequest(intent, session, callback) {
    // Provide a help prompt for the user, explaining how the game is played. Then, continue the game
    // if there is one in progress, or provide the option to start another one.

    // Set a flag to track that we're in the Help state.
    session.attributes.userPromptedToContinue = true;

    // Do not edit the help dialogue. This has been created by the Alexa team to demonstrate best practices.

    var speechOutput = "Sorry! The developers had no time to write a good help prompt."
    var shouldEndSession = false;
    callback(session.attributes,
        buildSpeechletResponseWithoutCard(speechOutput, repromptText, shouldEndSession));
}

function handleFinishSessionRequest(intent, session, callback) {
    // End the session with a "Good bye!" if the user wants to quit the game
    callback(session.attributes,
        buildSpeechletResponseWithoutCard("Later dog!", "", true));
}

// ------- Helper functions to build responses -------


function buildSpeechletResponse(title, output, repromptText, shouldEndSession) {
    var speechletResponse = {
        outputSpeech: {
            type: "PlainText",
            text: output
        },
        card: {
            type: "Simple",
            title: title,
            content: output
        },
        reprompt: {
            outputSpeech: {
                type: "PlainText",
                text: repromptText
            }
        },
        shouldEndSession: shouldEndSession
    };

    if (output.substring(0,7) == "<speak>")
    {
        speechletResponse.outputSpeech = {
            type: "SSML",
            ssml: output
        };
    }

    return speechletResponse;
}

function buildSpeechletResponseWithoutCard(output, repromptText, shouldEndSession) {
    return {
        outputSpeech: {
            type: "PlainText",
            text: output
        },
        reprompt: {
            outputSpeech: {
                type: "PlainText",
                text: repromptText
            }
        },
        shouldEndSession: shouldEndSession
    };
}

function buildResponse(sessionAttributes, speechletResponse) {
    return {
        version: "1.0",
        sessionAttributes: sessionAttributes,
        response: speechletResponse
    };
}
