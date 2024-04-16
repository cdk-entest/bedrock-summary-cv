---
title: simple ai cv summary using amazon bedrock
author: haimtran
date: 16/04/2024
---

## Introduction

This repo shows how to build a simple AI CV Summary Application using Amazon Bedrock and Next.JS

## Setup Project

Let create a new Next.JS project

```bash
npx create-next-app@latest
```

Then install bedrock runtime client and langchain pdf parser

```bash
npm install @aws-sdk/client-bedrock-runtime langchain pdf-parse
```

Project structure

```txt
|--app
   |--api
      |--route.ts
   |--page.tsx
|--Dockerfile
|--package.json
|--package-lock.json
```

## Backend

Let implement a sipmle API route (handler) in the server side, it will do

- parse the pdf file from user request
- parse user question from user request
- invoke bedrock claude 3 in streaming mode
- stream response to client

Detail backend code

<details>
<summary>route.ts</summary>

```ts
import { NextRequest, NextResponse } from "next/server";
import { PDFLoader } from "langchain/document_loaders/fs/pdf";
import {
  BedrockRuntimeClient,
  InvokeModelWithResponseStreamCommand,
} from "@aws-sdk/client-bedrock-runtime";

const decoder = new TextDecoder();

const bedrockClient = new BedrockRuntimeClient({
  region: "us-west-2",
});

async function* makeIterator(data: FormData) {
  // parse file
  const file = data.get("file") as Blob | null;

  // parse user question
  const userQuestion = data.get("userQuestion") as string | null;

  // process file
  const loader = new PDFLoader(file!);
  const docs = await loader.load();

  // extract and concate all pages
  let cvContent = "";
  // console.log(docs[0].pageContent);
  // concatenate all page content in docs to cv content
  docs.forEach((doc) => {
    cvContent += doc.pageContent;
  });

  // console.log(cvContent);

  // build a prompt to claude 3
  const command = new InvokeModelWithResponseStreamCommand({
    modelId: "anthropic.claude-3-haiku-20240307-v1:0",
    contentType: "application/json",
    accept: "application/json",
    body: JSON.stringify({
      anthropic_version: "bedrock-2023-05-31",
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: cvContent,
            },
            {
              type: "text",
              text: "Your are a Human Resource expert at a big bank, please summarize the above resume as detailed as possbile and make buttlet points for work experience and skills",
            },
            {
              type: "text",
              text: userQuestion
                ? userQuestion
                : "Please response in Vietnamese",
            },
          ],
        },
      ],
    }),
  });

  // invoke claude 3 stream mode
  try {
    console.log("call bedrock ...");
    const response = await bedrockClient.send(command);
    if (response.body) {
      console.log(response.body);
      for await (const chunk of response.body) {
        if (chunk.chunk) {
          try {
            const json = JSON.parse(decoder.decode(chunk.chunk.bytes));
            // console.log(json);
            if (json.type == "content_block_delta") {
              yield json.delta.text;
            }
          } catch (error) {
            console.log(error);
            yield " ";
          }
        }
      }
    }
  } catch (error) {
    console.log(error);
  }

  return NextResponse.json({ name: "hai", route: "/api/upload" });
}

function iteratorToStream(iterator: any) {
  return new ReadableStream({
    async pull(controller) {
      const { value, done } = await iterator.next();

      if (done) {
        controller.close();
      } else {
        controller.enqueue(value);
      }
    },
  });
}

export async function POST(request: NextRequest) {
  // read file
  console.log("call post method in api upload");
  const data = await request.formData();

  // console.log(data);
  // invoke bedrock stream
  const iterator = makeIterator(data);
  //
  const stream = iteratorToStream(iterator);
  return new Response(stream);
}
```

</details>

## FrontEnd

Let build a simple page for users to upload cv in PDF and optionally can ask questions

- form to capture pdf file and user question
- send a post request to /api/cv

Detail frontend page

<details>
<summary>page.tsx</summary>

```tsx
"use client";

const CVPage = () => {
  const submit = async (data: FormData) => {
    // present model response to frontend
    const modelAnswer = document.getElementById("model-answer");
    modelAnswer!.innerText = "";

    try {
      const response = await fetch("/api/cv", {
        method: "POST",
        body: data,
      });

      // console.log(response);
      const reader = response.body!.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }

        try {
          const json = decoder.decode(value);
          modelAnswer!.innerText += json;
          console.log(json);
        } catch (error) {
          console.log(error);
          modelAnswer!.innerText += "ERROR";
        }
      }
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <div className="flex flex-col w-full max-w-md py-10 mx-auto stretch">
      <div>
        <form className="mb-5" action={submit}>
          <div className="w-full bg-gray-200 justify-center items-center py-3 px-3 relative">
            <input
              type="file"
              id="file"
              name="file"
              className="w-full cursor-pointer py-2"
            ></input>
            <button
              id="upload-button"
              className="bg-orange-400 px-10 py-3 rounded-sm absolute top-[50%] right-2 translate-y-[-50%]"
              onClick={(event) => {
                console.log("upload file ...");
              }}
            >
              Upload CV
            </button>
          </div>
          <input
            type="text"
            className="w-full p-3 border border-gray-300 rounded shadow-xl mt-3"
            id="userQuestion"
            name="userQuestion"
            placeholder="Please summarize in 5 lines and response in Vietnamese"
          ></input>
        </form>
        <div>
          <p id="result"></p>
        </div>
      </div>
      <p
        id="model-answer"
        className="px-5"
        style={{ color: "green", marginBottom: "10px" }}
      ></p>
    </div>
  );
};

export default CVPage;
```

</details>

## Run Application

Let clone

```bash
git clone
```

Then run the local mode

```bash
npm run dev
```

## Deploy

There is a Dockerfile and a build.py script to build a docker image. Given the docker image, you can deploy the application in may ways such as in Amazon ECS, Amazon EKS, EC2, etc.
