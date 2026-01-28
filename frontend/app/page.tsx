import VideoChat from "@/components/rtc";

export default function Home() {
  fetch('http://localhost:3001').then(res => {
    res.json().then(json => console.log(json)).catch(err => console.log("json error", err))
  }).catch(err => console.log(err))
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <VideoChat />
    </div>
  );
}
