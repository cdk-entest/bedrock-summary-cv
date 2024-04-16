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
