from PIL import Image
import time
import os
import io

def compress_image(in_img: bytes, max_size: int=1000000, min_quality=5, max_quality=95) -> bytes:
    start = time.time()
    img = Image.open(io.BytesIO(in_img))
    if img.mode in ("RGBA", "LA", "P"):
        background = Image.new("RGB", img.size, (255, 255, 255))
        background.paste(img, mask=img.split()[-1] if img.mode in ("RGBA", "LA") else None)
        img = background
    else:
        img = img.convert("RGB")

    #Binary search for best quality
    low, high = min_quality, max_quality
    best_quality = low
    best_out = None

    while low<=high:
        mid = (low+high) // 2
        buffer = io.BytesIO()
        img.save(buffer, "JPEG", quality=mid, optimize=True)
        size = buffer.tell() # gives the last cursor position in the stream = size in bytes

        if size<=max_size:
            best_quality = mid
            best_out = buffer.getvalue()
            low = mid+1

        else:
            high = mid-1

    if best_out:
        end = time.time()
        print(f"Compressed in {end - start:.2f}s")
        return best_out

    else:
        raise ValueError("Could'nt compress below target size")