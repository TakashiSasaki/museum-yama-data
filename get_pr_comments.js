const fs = require('fs');

async function getComments() {
    try {
        const url = "https://api.github.com/repos/TakashiSasaki/museum-yama-data/pulls/32/reviews";
        const response = await fetch(url, {
            headers: {
                "Accept": "application/vnd.github.v3+json",
                "User-Agent": "Yama-Museum-Agent"
            }
        });
        const reviews = await response.json();
        console.log("Reviews:");
        console.log(JSON.stringify(reviews, null, 2));

        const commentsUrl = "https://api.github.com/repos/TakashiSasaki/museum-yama-data/pulls/32/comments";
        const commentsResponse = await fetch(commentsUrl, {
            headers: {
                "Accept": "application/vnd.github.v3+json",
                "User-Agent": "Yama-Museum-Agent"
            }
        });
        const comments = await commentsResponse.json();
        console.log("\nReview Comments:");
        console.log(JSON.stringify(comments, null, 2));

    } catch(err) {
        console.error(err);
    }
}
getComments();
