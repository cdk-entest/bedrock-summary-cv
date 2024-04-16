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
