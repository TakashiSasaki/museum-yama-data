const fs = require('fs');

async function getComments() {
    try {
        const url = "https://api.github.com/repos/TakashiSasaki/museum-yama-data/issues/32/comments";
        const response = await fetch(url, {
            headers: {
                "Accept": "application/vnd.github.v3+json",
                "User-Agent": "Yama-Museum-Agent"
            }
        });
        const comments = await response.json();
        console.log("\nIssue Comments:");
        console.log(JSON.stringify(comments, null, 2));

    } catch(err) {
        console.error(err);
    }
}
getComments();
