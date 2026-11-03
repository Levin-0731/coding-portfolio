#!/usr/bin/env python3
"""
视频模板素材一体化处理脚本
将 MP4 源视频批量转换为 720×960 H.265 视频（带音频，≤2MB）+ 首帧图
"""

import os
import sys
import subprocess
import argparse
from pathlib import Path


TARGET_MB = 2.0
TARGET_RES = (720, 960)
CRF_LADDER = ['28', '30', '32']


def check_tools():
    """检查必需工具是否已安装，且 ffmpeg 支持 libx265"""
    missing = []
    for tool in ['ffmpeg', 'ffprobe']:
        try:
            subprocess.run([tool, '-version'], capture_output=True, check=True)
        except (subprocess.CalledProcessError, FileNotFoundError):
            missing.append(tool)

    if missing:
        print(f"错误: 未找到以下工具: {', '.join(missing)}")
        print("安装方法: brew install ffmpeg")
        sys.exit(1)

    try:
        result = subprocess.run(['ffmpeg', '-hide_banner', '-encoders'],
                                capture_output=True, text=True, check=True)
        if 'libx265' not in result.stdout:
            print("错误: 当前 ffmpeg 未启用 libx265，无法生成 H.265 输出。")
            print("请重新安装支持 libx265 的 ffmpeg: brew install ffmpeg")
            sys.exit(1)
    except subprocess.CalledProcessError:
        pass


def get_video_info(video_path):
    """获取视频的分辨率、帧率、时长"""
    cmd = [
        'ffprobe', '-v', 'error',
        '-select_streams', 'v:0',
        '-show_entries', 'stream=width,height,r_frame_rate,duration',
        '-of', 'default=noprint_wrappers=1',
        str(video_path)
    ]
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        info = {}
        for line in result.stdout.strip().split('\n'):
            if '=' in line:
                key, value = line.split('=', 1)
                info[key] = value
        return info
    except subprocess.CalledProcessError as e:
        print(f"  错误: 无法获取视频信息 - {e.stderr}")
        return None


def get_file_size_kb(path):
    return os.path.getsize(path) / 1024


def get_file_size_mb(path):
    return os.path.getsize(path) / (1024 * 1024)


def _encode_h265_crf(input_path, output_path, crf):
    """用指定 CRF 重新编码 720×960 H.265 main10 + hvc1"""
    cmd = [
        'ffmpeg', '-y', '-i', str(input_path),
        '-vf', f'scale={TARGET_RES[0]}:{TARGET_RES[1]}:force_original_aspect_ratio=increase,'
               f'crop={TARGET_RES[0]}:{TARGET_RES[1]}',
        '-c:v', 'libx265', '-preset', 'medium', '-crf', str(crf),
        '-profile:v', 'main10', '-pix_fmt', 'yuv420p10le',
        '-tag:v', 'hvc1',
        '-c:a', 'aac', '-b:a', '128k', '-ar', '44100', '-ac', '2',
        '-movflags', '+faststart',
        str(output_path)
    ]
    subprocess.run(cmd, capture_output=True, text=True, check=True)


def _encode_h265_bitrate(input_path, output_path, duration):
    """比特率兜底：保证 ≤TARGET_MB"""
    video_bitrate = max(int((TARGET_MB * 8 * 1024 / duration) * 0.8) - 128, 200)
    cmd = [
        'ffmpeg', '-y', '-i', str(input_path),
        '-vf', f'scale={TARGET_RES[0]}:{TARGET_RES[1]}:force_original_aspect_ratio=increase,'
               f'crop={TARGET_RES[0]}:{TARGET_RES[1]}',
        '-c:v', 'libx265', '-preset', 'medium',
        '-b:v', f'{video_bitrate}k',
        '-maxrate', f'{video_bitrate}k',
        '-bufsize', f'{video_bitrate * 2}k',
        '-profile:v', 'main10', '-pix_fmt', 'yuv420p10le',
        '-tag:v', 'hvc1',
        '-c:a', 'aac', '-b:a', '128k', '-ar', '44100', '-ac', '2',
        '-movflags', '+faststart',
        str(output_path)
    ]
    subprocess.run(cmd, capture_output=True, text=True, check=True)


def convert_video_s(input_path, output_path, duration):
    """转换为 720×960 H.265 main10 + hvc1，带音频，≤TARGET_MB"""
    for crf in CRF_LADDER:
        _encode_h265_crf(input_path, output_path, crf)
        size = get_file_size_mb(output_path)
        if size <= TARGET_MB:
            return size, True, f"crf={crf}"

    _encode_h265_bitrate(input_path, output_path, duration)
    size = get_file_size_mb(output_path)
    return size, size <= TARGET_MB, "bitrate-fallback"


def extract_first_frame(input_path, output_path):
    """提取首帧为 JPG"""
    cmd = [
        'ffmpeg', '-y', '-ss', '0.0',
        '-i', str(input_path),
        '-vframes', '1', '-f', 'image2',
        '-q:v', '2',
        str(output_path)
    ]
    subprocess.run(cmd, capture_output=True, text=True, check=True)
    return os.path.exists(output_path)


def process_single_video(input_path, output_base_dir, dir_names, skip_existing=False, no_frame=False):
    """处理单个视频，生成 video_s（+ 可选 image_s）"""
    input_path = Path(input_path)
    output_base = Path(output_base_dir)
    stem = input_path.stem

    dirs = {'video': output_base / dir_names['video']}
    if not no_frame:
        dirs['frame'] = output_base / dir_names['frame']
    for d in dirs.values():
        d.mkdir(parents=True, exist_ok=True)

    print(f"\n{'='*60}")
    print(f"处理: {input_path.name}")
    print(f"{'='*60}")

    info = get_video_info(input_path)
    if not info:
        return False

    width = int(info.get('width', 0))
    height = int(info.get('height', 0))
    fps = info.get('r_frame_rate', '30/1')
    duration = float(info.get('duration', 0))

    print(f"  源信息: {width}x{height}, {fps}fps, {duration:.2f}s, "
          f"{get_file_size_mb(input_path):.2f}MB")

    results = {}
    total_steps = 1 if no_frame else 2

    out_video = dirs['video'] / f"{stem}.mp4"
    if skip_existing and out_video.exists():
        print(f"  [1/{total_steps}] video_s 已存在，跳过 ({get_file_size_mb(out_video):.2f}MB)")
        results['video'] = True
    else:
        try:
            print(f"  [1/{total_steps}] 转换 720×960 H.265 (main10 + hvc1)...")
            size, ok, mode = convert_video_s(input_path, out_video, duration)
            status = "✓" if ok else "⚠ 超出限制"
            print(f"        {status} {size:.2f}MB ({mode})")
            results['video'] = ok
        except subprocess.CalledProcessError as e:
            print(f"        ✗ ffmpeg 失败: {e.stderr[-300:] if e.stderr else e}")
            results['video'] = False
        except Exception as e:
            print(f"        ✗ 失败: {e}")
            results['video'] = False

    if no_frame:
        return all(results.values())

    out_frame = dirs['frame'] / f"{stem}.jpg"
    if skip_existing and out_frame.exists():
        print(f"  [2/{total_steps}] 首帧图已存在，跳过 ({get_file_size_kb(out_frame):.1f}KB)")
        results['frame'] = True
    else:
        try:
            print(f"  [2/{total_steps}] 提取首帧图（来源: {dirs['video'].name}）...")
            frame_source = out_video if out_video.exists() else input_path
            ok = extract_first_frame(frame_source, out_frame)
            if ok:
                print(f"        ✓ {get_file_size_kb(out_frame):.1f}KB")
            else:
                print(f"        ✗ 未生成")
            results['frame'] = ok
        except subprocess.CalledProcessError as e:
            print(f"        ✗ ffmpeg 失败: {e.stderr[-300:] if e.stderr else e}")
            results['frame'] = False
        except Exception as e:
            print(f"        ✗ 失败: {e}")
            results['frame'] = False

    return all(results.values())


DEFAULT_DIRS = {'video': 'video_s', 'frame': 'image_s'}


def main():
    parser = argparse.ArgumentParser(
        description='视频模板素材一体化处理：MP4 → 720×960 H.265 (≤2MB) + 首帧图',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
使用方法:
  处理目录下所有 mp4（产物输出到同目录的标准子目录）:
    python process_videos.py /path/to/template_group/

  处理指定文件（产物输出到文件所在目录）:
    python process_videos.py video1.mp4 video2.mp4

  指定输出根目录:
    python process_videos.py -o /output/path/ video1.mp4

  自定义目录名:
    python process_videos.py --dir-video video_s --dir-frame image_s /path/to/group/

  只压缩视频、不生成首帧图:
    python process_videos.py --no-frame /path/to/group/

  跳过已存在的产物（断点续跑）:
    python process_videos.py --skip-existing /path/to/group/
        """
    )

    parser.add_argument('inputs', nargs='+', help='MP4 文件或包含 MP4 的目录')
    parser.add_argument('-o', '--output', help='输出根目录（默认与输入同目录）')
    parser.add_argument('--dir-video', dest='dir_video', default=DEFAULT_DIRS['video'],
                        help=f'video_s 输出子目录名（默认 {DEFAULT_DIRS["video"]}）')
    parser.add_argument('--dir-frame', dest='dir_frame', default=DEFAULT_DIRS['frame'],
                        help=f'首帧图输出子目录名（默认 {DEFAULT_DIRS["frame"]}）')
    parser.add_argument('--no-frame', dest='no_frame', action='store_true',
                        help='只压缩视频，不生成首帧图（也不会创建首帧图目录）')
    parser.add_argument('--skip-existing', action='store_true', help='跳过已生成的产物文件')

    args = parser.parse_args()

    dir_names = {'video': args.dir_video, 'frame': args.dir_frame}

    check_tools()

    video_files = []
    default_output = None

    for inp in args.inputs:
        p = Path(inp)
        if p.is_dir():
            found = sorted(p.glob('*.mp4')) + sorted(p.glob('*.MP4'))
            if not found:
                for sub in ['mp4 原始', 'mp4原始', '原始', 'source', 'src']:
                    sub_dir = p / sub
                    if sub_dir.is_dir():
                        found = sorted(sub_dir.glob('*.mp4')) + sorted(sub_dir.glob('*.MP4'))
                        if found:
                            break
            video_files.extend(found)
            if default_output is None:
                default_output = p
        elif p.is_file() and p.suffix.lower() == '.mp4':
            video_files.append(p)
            if default_output is None:
                default_output = p.parent
        else:
            print(f"跳过: {inp}")

    if not video_files:
        print("错误: 未找到任何 MP4 文件")
        sys.exit(1)

    output_dir = Path(args.output) if args.output else default_output

    print(f"找到 {len(video_files)} 个视频文件")
    print(f"输出目录: {output_dir}")
    if args.no_frame:
        print(f"产物目录命名: video→{dir_names['video']} (不生成首帧图)")
    else:
        print(f"产物目录命名: video→{dir_names['video']} / frame→{dir_names['frame']}")
    print(f"视频规格: 720×960 H.265 main10 + hvc1, AAC 128k, ≤{TARGET_MB}MB")
    if args.skip_existing:
        print("模式: 跳过已存在产物")
    for v in video_files:
        print(f"  - {v.name}")

    success = 0
    fail = 0

    for vf in video_files:
        if process_single_video(vf, output_dir, dir_names,
                                skip_existing=args.skip_existing,
                                no_frame=args.no_frame):
            success += 1
        else:
            fail += 1

    print(f"\n{'='*60}")
    print(f"全部完成! 成功: {success}, 失败/警告: {fail}")
    print(f"{'='*60}")
    print(f"\n产物目录:")
    print(f"  {dir_names['video']}/  - 720×960 H.265 带音频 (≤{TARGET_MB}MB)")
    if not args.no_frame:
        print(f"  {dir_names['frame']}/  - 首帧 JPG (720×960)")


if __name__ == '__main__':
    main()
