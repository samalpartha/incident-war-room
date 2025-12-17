import api, { route } from "@forge/api";

const addJiraComment = async (issueKey, comment) => {
  const bodyData = {
    body: {
      type: "doc",
      version: 1,
      content: [
        { type: "paragraph", content: [{ text: comment, type: "text" }] },
      ],
    },
  };

  const response = await api.asUser().requestJira(route`/rest/api/3/issue/${issueKey}/comment`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(bodyData),
  });

  if (response.ok) {
    console.log(`Added comment '${comment}' to issueKey: ${issueKey}`);
  } else {
    console.log(
      `Failed to add comment '${comment}' to issueKey: ${issueKey}`
    );
  }
};

export async function addComment(payload) {
  const issueId = payload.issueKey;
  const comment = payload.comment;

  await addJiraComment(issueId, comment);
}
