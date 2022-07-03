const {
  src,
  dest,
  series,
  watch
} = require('gulp');
const autoprefixer = require('gulp-autoprefixer');
const cleanCSS = require('gulp-clean-css');
const del = require('del');
const browserSync = require('browser-sync').create();
const sass = require('gulp-sass')(require('sass'));
const svgSprite = require('gulp-svg-sprite');
const svgmin = require('gulp-svgmin');
const cheerio = require('gulp-cheerio');
const replace = require('gulp-replace');
const fileInclude = require('gulp-file-include');
const rev = require('gulp-rev');
const revRewrite = require('gulp-rev-rewrite');
const revDel = require('gulp-rev-delete-original');
const htmlmin = require('gulp-htmlmin');
const gulpif = require('gulp-if');
const notify = require('gulp-notify');
const imagemin = require('gulp-imagemin');
const {
  readFileSync
} = require('fs');
const webp = require('gulp-webp');
const webpack = require('webpack-stream');
const plumber = require('gulp-plumber');
const rename = require('gulp-rename');
const size = require('gulp-size');
const newer = require('gulp-newer');
const webpHtmlNosvg = require('gulp-webp-html-nosvg');


// paths
const srcFolder = './src';
const buildFolder = './app';
const paths = {
  srcScss: `${srcFolder}/scss/**/*.scss`,
  buildCssFolder: `${buildFolder}/css`,
  srcSvg: `${srcFolder}/img/svg/**.svg`,
  srcImgFolder: `${srcFolder}/img`,
  buildImgFolder: `${buildFolder}/img`,
  srcFullJs: `${srcFolder}/js/**/*.js`,
  srcMainJs: `${srcFolder}/js/main.js`,
  buildJsFolder: `${buildFolder}/js`,
  srcHtmlFolder: `${srcFolder}/html`,
  resourcesFolder: `${srcFolder}/resources`,
};

let isProd = false; // dev by default

// Очистить каталог app
const clean = () => {
  return del([buildFolder])
}

// Обработка html
const html = () => {
  return src(`${srcFolder}/*.html`)
    .pipe(plumber(
      notify.onError({
        title: "HTML",
        message: "Error: <%= error.message %>"
      })
    ))
    .pipe(fileInclude())
    .pipe(replace(/@img\//g, 'img/'))
    .pipe(webpHtmlNosvg())
    .pipe(htmlmin({
      collapseWhitespace: true
    }))
    .pipe(size({
      showFiles: true
    }))
    .pipe(dest(buildFolder))
    .pipe(browserSync.stream())
}

// Обработка стилей
const styles = () => {
  return src(paths.srcScss, { sourcemaps: !isProd })
    .pipe(plumber(
      notify.onError({
        title: "SCSS",
        message: "Error: <%= error.message %>"
      })
    ))
    .pipe(sass())
    .pipe(autoprefixer({
      cascade: false,
      grid: true,
      overrideBrowserslist: ["last 5 versions"]
    }))
    .pipe(gulpif(isProd, cleanCSS({
      level: 2
    })))
    .pipe(rename({
      extname: ".min.css"
    }))
    .pipe(size({
      showFiles: true
    }))
    .pipe(dest(paths.buildCssFolder, { sourcemaps: '.' }))
    .pipe(browserSync.stream());
};


// Обработка скриптов
const scripts = () => {
  return src(paths.srcMainJs)
    .pipe(plumber(
      notify.onError({
        title: "JS",
        message: "Error: <%= error.message %>"
      })
    ))
    .pipe(webpack({
      mode: isProd ? 'production' : 'development',
      output: {
        filename: 'main.min.js'
      },
      module: {
        rules: [{
          test: /\.m?js$/,
          exclude: /node_modules/,
          use: {
            loader: 'babel-loader',
            options: {
              presets: [
                ['@babel/preset-env', {
                  targets: "defaults"
                }]
              ]
            }
          }
        }]
      },
      devtool: !isProd ? 'source-map' : false
    }))
    .pipe(size({
      showFiles: true
    }))
    .pipe(dest(paths.buildJsFolder))
    .pipe(browserSync.stream())
}

// Обработка изображений
const images = () => {
  return src(`${paths.srcImgFolder}/**/**.{jpg,jpeg,png,svg,webp}`)
    .pipe(plumber(
      notify.onError({
        title: "IMAGES",
        message: "Error: <%= error.message %>"
      })
    ))
    .pipe(newer(paths.buildImgFolder))
    .pipe(gulpif(isProd, imagemin({
      progressive: true,
      optimizationLevel: 3,
      quality: 80,
      svgoPlugins: [{
        removeViewBox: false
      }]
    })))
    .pipe(size({
      showFiles: true
    }))
    .pipe(dest(paths.buildImgFolder))
    .pipe(browserSync.stream())
}

// Конвертация в WebP
const webpImages = () => {
  return src([`${paths.srcImgFolder}/**/**.{jpg,jpeg,png}`])
    .pipe(webp())
    .pipe(dest(paths.buildImgFolder))
};

// SVG Sprites
const svgSprites = () => {
  return src(paths.srcSvg)
    .pipe(plumber(
      notify.onError({
        title: "SVG",
        message: "Error: <%= error.message %>"
      })
    ))
    .pipe(svgmin({
      js2svg: {
        pretty: true,
      },
    }))
    .pipe(
      cheerio({
        run: function ($) {
          $('[fill]').removeAttr('fill')
          $('[stroke]').removeAttr('stroke')
          $('[style]').removeAttr('style')
        },
        parserOptions: {
          xmlMode: true
        },
      })
    )
    .pipe(replace('&gt;', '>'))
    .pipe(svgSprite({
      mode: {
        stack: {
          sprite: "../sprite.svg"
        }
      }
    }))
    .pipe(dest(paths.buildImgFolder))
}

// Путь к файлам resourse
const resources = () => {
  return src(`${paths.resourcesFolder}/**`)
    .pipe(dest(buildFolder))
}

const watchFiles = () => {
  browserSync.init({
    server: {
      baseDir: `${buildFolder}`
    },
  });

  watch(paths.srcScss, styles);
  watch(paths.srcFullJs, scripts);
  watch(`${paths.srcHtmlFolder}/*.html`, html);
  watch(`${srcFolder}/*.html`, html);
  watch(`${paths.resourcesFolder}/**`, resources);
  watch(`${paths.srcImgFolder}/**/**.{jpg,jpeg,png,svg}`, images);
  watch(`${paths.srcImgFolder}/**/**.{jpg,jpeg,png}`, webpImages);
  watch(paths.srcSvg, svgSprites);
}

const cache = () => {
  return src(`${buildFolder}/**/*.{css,js,svg,png,jpg,jpeg,webp,avif,woff2}`, {
    base: buildFolder
  })
    .pipe(rev())
    .pipe(revDel())
    .pipe(dest(buildFolder))
    .pipe(rev.manifest('rev.json'))
    .pipe(dest(buildFolder));
};

const rewrite = () => {
  const manifest = readFileSync('app/rev.json');
  src(`${paths.buildCssFolder}/*.css`)
    .pipe(revRewrite({
      manifest
    }))
    .pipe(dest(paths.buildCssFolder));
  return src(`${buildFolder}/**/*.html`)
    .pipe(revRewrite({
      manifest
    }))
    .pipe(dest(buildFolder));
}

const toProd = (done) => {
  isProd = true;
  done();
};

exports.default = series(clean, html, scripts, styles, resources, images, webpImages, svgSprites, watchFiles);

exports.build = series(toProd, clean, html, scripts, styles, resources, images, webpImages, svgSprites);

exports.cache = series(cache, rewrite);

