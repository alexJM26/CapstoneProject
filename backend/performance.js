// needed imports
import http from "k6/http";
import { sleep, check } from "k6";

// adjustable variables -- UPDATE TO INCREASE USERS AND/OR TEST DURATION
const virtualUserCount = 1000;
const testDuration = "60s"; // format must be "_s"
const currentURL = "https://tbrd.onrender.com/"; // our site's current URL

// test options
export const options = {
    vus: virtualUserCount, // number of simulated users
    duration: testDuration, // duration of the test
};

// function runs concurrently for each virtual user
export default function () {
    const response = http.get(currentURL); // sends GET request to URL, stores response

    // checks for the current response
    check(response, {
        "status is 200": (r) => r.status == 200, // check if http response was succesful
        "body is not empty": (r) => r.body.length > 0 // make sure the body of the http request isn't empty
    });

    sleep(1); // makes each vu wait 1 second between requests
}