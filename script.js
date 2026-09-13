import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { SVGLoader } from "three/addons/loaders/SVGLoader.js";
import { STLExporter } from "three/addons/exporters/STLExporter.js";
import polygonClipping from "https://cdn.jsdelivr.net/npm/polygon-clipping@0.15.7/+esm";

const VERSION = "0.5.4";
const LARGURA_PADRAO_MM = 40;

const $ = (seletor) => document.querySelector(seletor);

const els = {
    arquivoSvg: $("#arquivoSvg"),
    btnEscolherSvg: $("#btnEscolherSvg"),
    btnBiblioteca: $("#btnBiblioteca"),
    arquivoInfo: $("#arquivoInfo"),

    larguraFinal: $("#larguraFinal"),
    larguraFinalNumero: $("#larguraFinalNumero"),
    larguraFinalValor: $("#larguraFinalValor"),

    espessuraBase: $("#espessuraBase"),
    espessuraBaseNumero: $("#espessuraBaseNumero"),
    espessuraBaseValor: $("#espessuraBaseValor"),

    modoDetalhe: $("#modoDetalhe"),
    letrasFuradas: $("#letrasFuradas"),
    controleAlturaDetalhe: $("#controleAlturaDetalhe"),

    alturaDetalhe: $("#alturaDetalhe"),
    alturaDetalheNumero: $("#alturaDetalheNumero"),
    alturaDetalheValor: $("#alturaDetalheValor"),

    qtdBase: $("#qtdBase"),
    qtdAzul: $("#qtdAzul"),
    qtdPreto: $("#qtdPreto"),
    dimensaoOriginal: $("#dimensaoOriginal"),
    dimensaoFinal: $("#dimensaoFinal"),

    viewport: $("#viewport"),
    placeholder: $("#placeholder"),
    btnCentralizar: $("#btnCentralizar"),

    estadoStl: $("#estadoStl"),
    mensagemStl: $("#mensagemStl"),
    nomeArquivo: $("#nomeArquivo"),
    btnGerarStl: $("#btnGerarStl"),
    btnBaixarStl: $("#btnBaixarStl"),

    statusTopo: $("#statusTopo"),

    modalBiblioteca: $("#modalBiblioteca"),
    btnFecharBiblioteca: $("#btnFecharBiblioteca"),
    buscaBiblioteca: $("#buscaBiblioteca"),
    filtrosBiblioteca: $("#filtrosBiblioteca"),
    gradeBiblioteca: $("#gradeBiblioteca"),
    bibliotecaContagem: $("#bibliotecaContagem"),
    bibliotecaVazia: $("#bibliotecaVazia")
};

const CORES = {
    vermelho: "#ff0000",
    azul: "#0000ff",
    preto: "#000000"
};

let svgTextoAtual = "";
let svgNomeAtual = "";
let svgInfoAtual = null;

let scene;
let camera;
let renderer;
let controls;
let grupoModelo = null;

let stlBlob = null;
let assinaturaStl = null;

let bibliotecaDados = null;
let bibliotecaCategoria = "Todos";
let bibliotecaBusca = "";

/*
    Cache de miniaturas recoloridas.
    Os SVGs originais continuam usando vermelho/azul porque essas
    cores fazem parte da convenção técnica do gerador.
*/
const cacheMiniaturas = new Map();

let PathKitEmoji = null;
let pathKitEmojiPromise = null;

const PATHKIT_EMOJI_CDN =
    "https://cdn.jsdelivr.net/npm/pathkit-wasm@1.0.0/bin/";

const EMOJI_PADRAO = {
    tamanho: 35.6,
    outline: 2.5,
    furo: 4.8,
    bordaFuro: 3.0,
    anguloArgola: -45
};

const loader = new SVGLoader();
const exporter = new STLExporter();




function aplicarLarguraDoExemplo(item) {
    const largura =
        Number(
            item?.larguraPadrao
        ) ||
        (
            item?.categoria === "Nomes"
                ? 50
                : LARGURA_PADRAO_MM
        );

    els.larguraFinal.value =
        String(largura);

    els.larguraFinalNumero.value =
        String(largura);

    els.larguraFinalValor.textContent =
        `${formatarNumero(
            largura,
            0
        )} mm`;
}

function aplicarLarguraPadraoInicial() {
    /*
        O navegador pode restaurar o valor anterior de inputs
        após reload. Por isso o padrão de 40 mm é aplicado
        explicitamente pelo JavaScript a cada nova abertura
        do aplicativo.
    */
    els.larguraFinal.value =
        String(LARGURA_PADRAO_MM);

    els.larguraFinalNumero.value =
        String(LARGURA_PADRAO_MM);

    els.larguraFinalValor.textContent =
        `${LARGURA_PADRAO_MM} mm`;
}

function formatarNumero(valor, casas = 1) {
    return Number(valor).toLocaleString("pt-BR", {
        minimumFractionDigits: casas,
        maximumFractionDigits: casas
    });
}


function normalizarCor(cor) {
    if (!cor) return "";

    const c = String(cor)
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "");

    const mapa = {
        "red": "#ff0000",
        "#f00": "#ff0000",
        "rgb(255,0,0)": "#ff0000",

        "blue": "#0000ff",
        "#00f": "#0000ff",
        "rgb(0,0,255)": "#0000ff",

        "black": "#000000",
        "#000": "#000000",
        "rgb(0,0,0)": "#000000"
    };

    return mapa[c] ?? c;
}


function corDoPath(path) {
    const estilo = path.userData?.style ?? {};

    const stroke = normalizarCor(estilo.stroke);
    const fill = normalizarCor(estilo.fill);

    if (stroke && stroke !== "none") {
        return stroke;
    }

    if (fill && fill !== "none") {
        return fill;
    }

    return "";
}


function categoriaPath(path) {
    const cor = corDoPath(path);

    if (cor === CORES.vermelho) return "base";
    if (cor === CORES.azul) return "azul";
    if (cor === CORES.preto) return "preto";

    return "outro";
}


function pathFechado(subPath) {
    /*
        Para descobrir se o contorno fecha não é necessário
        discretizar cada curva em dezenas de pontos.
    */
    const pts = subPath.getPoints(1);

    if (pts.length < 3) return false;

    const a = pts[0];
    const b = pts[pts.length - 1];

    return a.distanceTo(b) < 0.5;
}


function pontosSubPathOtimizado(subPath) {
    /*
        A amostragem agora é adaptativa.

        SVGs de emoji podem conter dezenas ou centenas de curvas.
        Limitamos a discretização para manter aproximadamente até
        700 pontos por contorno, em vez de multiplicar cada curva
        por dezenas de subdivisões.
    */
    const quantidadeCurvas =
        Math.max(
            1,
            subPath.curves?.length ?? 1
        );

    const divisoes =
        Math.max(
            1,
            Math.min(
                10,
                Math.floor(
                    700 /
                    quantidadeCurvas
                )
            )
        );

    return limparPontos(
        subPath.getPoints(
            divisoes
        )
    );
}


function areaPoligono(points) {
    let area = 0;

    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
        area +=
            points[j].x * points[i].y -
            points[i].x * points[j].y;
    }

    return area / 2;
}


function pontoNoPoligono(ponto, poligono) {
    let dentro = false;

    for (
        let i = 0, j = poligono.length - 1;
        i < poligono.length;
        j = i++
    ) {
        const xi = poligono[i].x;
        const yi = poligono[i].y;

        const xj = poligono[j].x;
        const yj = poligono[j].y;

        const cruza =
            ((yi > ponto.y) !== (yj > ponto.y)) &&
            (
                ponto.x <
                ((xj - xi) * (ponto.y - yi)) /
                ((yj - yi) || 1e-9) +
                xi
            );

        if (cruza) dentro = !dentro;
    }

    return dentro;
}


function limparPontos(points) {
    if (points.length < 2) return points;

    const resultado = [];

    for (const p of points) {
        const ultimo = resultado[resultado.length - 1];

        if (!ultimo || ultimo.distanceTo(p) > 1e-4) {
            resultado.push(p.clone());
        }
    }

    if (
        resultado.length > 2 &&
        resultado[0].distanceTo(resultado[resultado.length - 1]) < 1e-4
    ) {
        resultado.pop();
    }

    return resultado;
}


function contornosDaCategoria(paths, categoria) {
    const contornos = [];

    for (const path of paths) {
        if (categoriaPath(path) !== categoria) continue;

        for (const subPath of path.subPaths) {
            if (!pathFechado(subPath)) continue;

            const points =
                pontosSubPathOtimizado(
                    subPath
                );

            if (points.length < 3) continue;

            const area = areaPoligono(points);

            if (Math.abs(area) < 1e-4) continue;

            contornos.push({
                points,
                area,
                absArea: Math.abs(area),
                depth: 0,
                parent: null
            });
        }
    }

    return contornos;
}


function analisarHierarquiaContornos(contornos) {
    const ordenados = [...contornos]
        .sort((a, b) => b.absArea - a.absArea)
        .map(item => ({
            ...item,
            parent: null,
            depth: 0
        }));

    for (let i = 0; i < ordenados.length; i++) {
        const atual = ordenados[i];
        const pTeste = atual.points[0];

        let melhorPai = null;

        for (let j = 0; j < i; j++) {
            const candidato =
                ordenados[j];

            if (
                pontoNoPoligono(
                    pTeste,
                    candidato.points
                )
            ) {
                /*
                    O pai correto é o menor contorno que contém
                    o atual. Isso preserva nesting do tipo:

                    forma externa -> furo -> ilha interna.
                */
                if (
                    !melhorPai ||
                    candidato.absArea <
                        melhorPai.absArea
                ) {
                    melhorPai =
                        candidato;
                }
            }
        }

        if (melhorPai) {
            atual.parent =
                melhorPai;

            atual.depth =
                melhorPai.depth + 1;
        }
    }

    return ordenados;
}


function construirShapesComFuros(contornos) {
    const ordenados =
        analisarHierarquiaContornos(contornos);

    const shapes = [];

    for (const item of ordenados) {
        if (item.depth % 2 !== 0) continue;

        const shape = new THREE.Shape();

        item.points.forEach((p, index) => {
            if (index === 0) shape.moveTo(p.x, -p.y);
            else shape.lineTo(p.x, -p.y);
        });

        shape.closePath();

        const filhos = ordenados.filter(
            outro =>
                outro.parent === item &&
                outro.depth === item.depth + 1
        );

        for (const holeItem of filhos) {
            const hole = new THREE.Path();

            holeItem.points.forEach((p, index) => {
                if (index === 0) hole.moveTo(p.x, -p.y);
                else hole.lineTo(p.x, -p.y);
            });

            hole.closePath();

            shape.holes.push(hole);
        }

        shapes.push(shape);
    }

    return shapes;
}


function fecharAnel(points) {
    const anel = points.map(
        p => [p.x, -p.y]
    );

    if (!anel.length) return anel;

    const primeiro = anel[0];
    const ultimo = anel[anel.length - 1];

    if (
        primeiro[0] !== ultimo[0] ||
        primeiro[1] !== ultimo[1]
    ) {
        anel.push([
            primeiro[0],
            primeiro[1]
        ]);
    }

    return anel;
}


function contornosParaMultiPoligono(contornos) {
    const ordenados =
        analisarHierarquiaContornos(contornos);

    const multi = [];

    for (const item of ordenados) {
        if (item.depth % 2 !== 0) continue;

        const poligono = [
            fecharAnel(item.points)
        ];

        const filhos = ordenados.filter(
            outro =>
                outro.parent === item &&
                outro.depth === item.depth + 1
        );

        for (const holeItem of filhos) {
            poligono.push(
                fecharAnel(holeItem.points)
            );
        }

        multi.push(poligono);
    }

    return multi;
}


function caminhoDeAnel(anel, PathClass) {
    const pontos = anel
        .slice(
            0,
            anel.length > 1 &&
            anel[0][0] === anel[anel.length - 1][0] &&
            anel[0][1] === anel[anel.length - 1][1]
                ? -1
                : undefined
        );

    if (pontos.length < 3) {
        return null;
    }

    const path = new PathClass();

    pontos.forEach(([x, y], index) => {
        if (index === 0) {
            path.moveTo(x, y);
        } else {
            path.lineTo(x, y);
        }
    });

    path.closePath();

    return path;
}


function multiPoligonoParaShapes(multi) {
    const shapes = [];

    for (const poligono of multi) {
        if (!poligono?.length) continue;

        const shape =
            caminhoDeAnel(
                poligono[0],
                THREE.Shape
            );

        if (!shape) continue;

        for (let i = 1; i < poligono.length; i++) {
            const hole =
                caminhoDeAnel(
                    poligono[i],
                    THREE.Path
                );

            if (hole) {
                shape.holes.push(hole);
            }
        }

        shapes.push(shape);
    }

    return shapes;
}


function geometriaBaseComLetrasFuradas(
    paths,
    profundidade
) {
    const baseContornos =
        contornosDaCategoria(
            paths,
            "base"
        );

    const letraContornos =
        contornosDaCategoria(
            paths,
            "azul"
        );

    if (!baseContornos.length) {
        return {
            geometry: null,
            count: 0,
            cutCount: 0
        };
    }

    const baseMulti =
        contornosParaMultiPoligono(
            baseContornos
        );

    let resultado = baseMulti;

    if (letraContornos.length) {
        const letrasMulti =
            contornosParaMultiPoligono(
                letraContornos
            );

        if (letrasMulti.length) {
            resultado =
                polygonClipping.difference(
                    baseMulti,
                    letrasMulti
                );
        }
    }

    const shapes =
        multiPoligonoParaShapes(
            resultado
        );

    if (!shapes.length) {
        return {
            geometry: null,
            count: baseContornos.length,
            cutCount: letraContornos.length
        };
    }

    const geometry =
        new THREE.ExtrudeGeometry(
            shapes,
            {
                depth: profundidade,
                bevelEnabled: false,
                curveSegments: 20,
                steps: 1
            }
        );

    geometry.computeVertexNormals();

    return {
        geometry,
        count: baseContornos.length,
        cutCount: letraContornos.length
    };
}


function geometriaCategoria(paths, categoria, profundidade) {
    const contornos = contornosDaCategoria(paths, categoria);

    if (!contornos.length) {
        return {
            geometry: null,
            count: 0
        };
    }

    const shapes = construirShapesComFuros(contornos);

    if (!shapes.length) {
        return {
            geometry: null,
            count: contornos.length
        };
    }

    const geometry = new THREE.ExtrudeGeometry(
        shapes,
        {
            depth: profundidade,
            bevelEnabled: false,
            curveSegments: 20,
            steps: 1
        }
    );

    geometry.computeVertexNormals();

    return {
        geometry,
        count: contornos.length
    };
}


function extrairViewBox(svgTexto) {
    const doc = new DOMParser()
        .parseFromString(svgTexto, "image/svg+xml");

    const svg = doc.documentElement;

    const viewBox = svg.getAttribute("viewBox");

    if (viewBox) {
        const valores = viewBox
            .trim()
            .split(/[\s,]+/)
            .map(Number);

        if (
            valores.length === 4 &&
            valores.every(Number.isFinite)
        ) {
            return {
                x: valores[0],
                y: valores[1],
                width: Math.abs(valores[2]),
                height: Math.abs(valores[3])
            };
        }
    }

    const width = parseFloat(svg.getAttribute("width")) || 100;
    const height = parseFloat(svg.getAttribute("height")) || 100;

    return {
        x: 0,
        y: 0,
        width,
        height
    };
}


function contarElementosPorCor(svgTexto) {
    const data = loader.parse(svgTexto);

    const contagens = {
        base: 0,
        azul: 0,
        preto: 0,
        outros: 0,
        abertosAzul: 0,
        abertosPreto: 0
    };

    for (const path of data.paths) {
        const categoria = categoriaPath(path);

        let fechados = 0;
        let abertos = 0;

        for (const subPath of path.subPaths) {
            if (pathFechado(subPath)) fechados++;
            else abertos++;
        }

        if (categoria === "base") {
            contagens.base += fechados;
        } else if (categoria === "azul") {
            contagens.azul += fechados;
            contagens.abertosAzul += abertos;
        } else if (categoria === "preto") {
            contagens.preto += fechados;
            contagens.abertosPreto += abertos;
        } else {
            contagens.outros += fechados + abertos;
        }
    }

    return {
        data,
        contagens
    };
}


function valoresAtuais() {
    return {
        largura: Number(els.larguraFinal.value),
        espessuraBase: Number(els.espessuraBase.value),
        modoDetalhe: els.modoDetalhe.value,
        letrasFuradas: els.letrasFuradas.checked,
        alturaDetalhe: Number(els.alturaDetalhe.value)
    };
}


function assinaturaAtual() {
    return JSON.stringify({
        svg: svgTextoAtual,
        valores: valoresAtuais()
    });
}


function invalidarStl() {
    stlBlob = null;
    assinaturaStl = null;

    els.btnBaixarStl.disabled = true;

    if (svgTextoAtual) {
        els.estadoStl.textContent = "Pronto para gerar";
        els.mensagemStl.textContent =
            "A prévia está atualizada. Clique em Gerar STL.";
    } else {
        els.estadoStl.textContent = "Aguardando SVG";
        els.mensagemStl.textContent =
            "Carregue um SVG válido para habilitar a exportação.";
    }
}


function removerGrupoAnterior() {
    if (!grupoModelo) return;

    scene.remove(grupoModelo);

    grupoModelo.traverse(obj => {
        if (obj.geometry) {
            obj.geometry.dispose();
        }

        if (obj.material) {
            if (Array.isArray(obj.material)) {
                obj.material.forEach(m => m.dispose());
            } else {
                obj.material.dispose();
            }
        }
    });

    grupoModelo = null;
}


function materialBase() {
    return new THREE.MeshStandardMaterial({
        color: 0xe17d01,
        roughness: 0.66,
        metalness: 0.02,
        side: THREE.DoubleSide
    });
}


function materialDetalhe() {
    return new THREE.MeshStandardMaterial({
        color: 0x531c33,
        roughness: 0.58,
        metalness: 0.02,
        side: THREE.DoubleSide
    });
}


function construirModelo3D() {
    removerGrupoAnterior();

    if (!svgTextoAtual || !svgInfoAtual) {
        return false;
    }

    const valores = valoresAtuais();
    const { data } = svgInfoAtual;

    const baseInfo =
        valores.letrasFuradas
            ? geometriaBaseComLetrasFuradas(
                data.paths,
                valores.espessuraBase
            )
            : geometriaCategoria(
                data.paths,
                "base",
                valores.espessuraBase
            );

    if (!baseInfo.geometry) {
        definirErro(
            "Não encontrei contornos vermelhos fechados para formar a base."
        );

        return false;
    }

    grupoModelo = new THREE.Group();

    const base = new THREE.Mesh(
        baseInfo.geometry,
        materialBase()
    );

    grupoModelo.add(base);

    if (valores.modoDetalhe === "alto") {
        const categoriasDetalhe =
            valores.letrasFuradas
                ? ["preto"]
                : ["azul", "preto"];

        for (const categoria of categoriasDetalhe) {
            const detalheInfo = geometriaCategoria(
                data.paths,
                categoria,
                valores.alturaDetalhe
            );

            if (!detalheInfo.geometry) continue;

            const detalhe = new THREE.Mesh(
                detalheInfo.geometry,
                materialDetalhe()
            );

            detalhe.position.z = valores.espessuraBase;

            grupoModelo.add(detalhe);
        }
    }

    const boxOriginal = new THREE.Box3()
        .setFromObject(grupoModelo);

    const tamanhoOriginal = new THREE.Vector3();
    boxOriginal.getSize(tamanhoOriginal);

    if (tamanhoOriginal.x <= 0 || !Number.isFinite(tamanhoOriginal.x)) {
        definirErro("A geometria do SVG possui dimensão inválida.");
        removerGrupoAnterior();
        return false;
    }

    const escalaXY =
        valores.largura / tamanhoOriginal.x;

    /*
        A largura final altera somente X e Y.
        A escala é incorporada diretamente às geometrias,
        preservando Z para manter a espessura da base e
        a altura do relevo exatamente nos valores configurados.
    */
    const matrizEscalaXY =
        new THREE.Matrix4().makeScale(
            escalaXY,
            escalaXY,
            1
        );

    grupoModelo.traverse(obj => {
        if (obj.isMesh && obj.geometry) {
            obj.geometry.applyMatrix4(
                matrizEscalaXY
            );

            obj.geometry.computeBoundingBox();
            obj.geometry.computeBoundingSphere();
        }
    });

    grupoModelo.scale.set(1, 1, 1);

    scene.add(grupoModelo);

    centralizarModelo(false);

    const boxFinal = new THREE.Box3()
        .setFromObject(grupoModelo);

    const tamanhoFinal = new THREE.Vector3();
    boxFinal.getSize(tamanhoFinal);

    els.dimensaoFinal.textContent =
        `${formatarNumero(tamanhoFinal.x, 1)} × ` +
        `${formatarNumero(tamanhoFinal.y, 1)} × ` +
        `${formatarNumero(tamanhoFinal.z, 1)} mm`;

    els.placeholder.hidden = true;
    els.btnCentralizar.disabled = false;
    els.btnGerarStl.disabled = false;

    els.statusTopo.textContent = "Prévia atualizada";

    return true;
}


function centralizarModelo(ajustarCamera = true) {
    if (!grupoModelo) return;

    const box = new THREE.Box3().setFromObject(grupoModelo);

    const centro = new THREE.Vector3();
    const tamanho = new THREE.Vector3();

    box.getCenter(centro);
    box.getSize(tamanho);

    grupoModelo.position.x -= centro.x;
    grupoModelo.position.y -= centro.y;
    grupoModelo.position.z -= box.min.z;

    if (!ajustarCamera) {
        ajustarCamera = true;
    }

    if (ajustarCamera) {
        const maior = Math.max(
            tamanho.x,
            tamanho.y,
            tamanho.z,
            30
        );

        camera.position.set(
            maior * 1.05,
            -maior * 1.20,
            maior * 0.90
        );

        controls.target.set(
            0,
            0,
            tamanho.z * 0.25
        );

        camera.near = Math.max(0.1, maior / 200);
        camera.far = Math.max(1000, maior * 20);

        camera.updateProjectionMatrix();
        controls.update();
    }
}


function definirErro(mensagem) {
    els.estadoStl.textContent = "Erro no SVG";
    els.mensagemStl.textContent = mensagem;

    els.statusTopo.textContent = "SVG com problema";

    els.btnGerarStl.disabled = true;
    els.btnBaixarStl.disabled = true;
}


function atualizarDiagnostico() {
    if (!svgInfoAtual) {
        els.qtdBase.textContent = "—";
        els.qtdAzul.textContent = "—";
        els.qtdPreto.textContent = "—";
        els.dimensaoOriginal.textContent = "—";
        return;
    }

    const c = svgInfoAtual.contagens;
    const vb = svgInfoAtual.viewBox;

    els.qtdBase.textContent = String(c.base);

    els.qtdAzul.textContent =
        c.abertosAzul
            ? `${c.azul} fechados + ${c.abertosAzul} abertos`
            : String(c.azul);

    els.qtdPreto.textContent =
        c.abertosPreto
            ? `${c.preto} fechados + ${c.abertosPreto} abertos`
            : String(c.preto);

    els.dimensaoOriginal.textContent =
        `${formatarNumero(vb.width, 1)} × ` +
        `${formatarNumero(vb.height, 1)}`;
}


function processarSvg(svgTexto, nome = "arquivo.svg") {
    try {
        if (!svgTexto.includes("<svg")) {
            throw new Error("O arquivo não contém uma raiz SVG.");
        }

        const parsed = contarElementosPorCor(svgTexto);
        const viewBox = extrairViewBox(svgTexto);

        svgTextoAtual = svgTexto;
        svgNomeAtual = nome;

        svgInfoAtual = {
            ...parsed,
            viewBox
        };

        atualizarDiagnostico();

        els.arquivoInfo.textContent = nome;

        const nomeLimpo = nome
            .replace(/\.svg$/i, "")
            .replace(/[^\p{L}\p{N}_-]+/gu, "-")
            .replace(/^-+|-+$/g, "");

        if (nomeLimpo) {
            els.nomeArquivo.value = `${nomeLimpo}-3d`;
        }

        invalidarStl();

        const ok = construirModelo3D();

        if (!ok) return;

        els.estadoStl.textContent = "Pronto para gerar";
        els.mensagemStl.textContent =
            "A geometria está pronta. Gere o STL quando desejar.";

        els.statusTopo.textContent = "SVG carregado";
    } catch (erro) {
        console.error(erro);

        svgTextoAtual = "";
        svgInfoAtual = null;

        removerGrupoAnterior();

        els.placeholder.hidden = false;
        els.btnCentralizar.disabled = true;

        definirErro(
            erro?.message ||
            "Não foi possível interpretar o SVG."
        );
    }
}


function gerarStl() {
    if (!grupoModelo || !svgTextoAtual) return;

    els.btnGerarStl.disabled = true;
    els.btnBaixarStl.disabled = true;

    els.estadoStl.textContent = "Gerando STL";
    els.mensagemStl.textContent =
        "Convertendo a geometria da prévia...";

    els.statusTopo.textContent = "Gerando STL";

    try {
        grupoModelo.updateMatrixWorld(true);

        const textoStl = exporter.parse(
            grupoModelo,
            {
                binary: false
            }
        );

        if (
            typeof textoStl !== "string" ||
            !textoStl.includes("facet normal")
        ) {
            throw new Error(
                "O exportador não produziu um STL ASCII válido."
            );
        }

        stlBlob = new Blob(
            [textoStl],
            {
                type: "model/stl"
            }
        );

        assinaturaStl = assinaturaAtual();

        els.estadoStl.textContent = "STL pronto";
        els.mensagemStl.textContent =
            "Arquivo gerado com sucesso. Agora você pode baixar.";

        els.btnBaixarStl.disabled = false;

        els.statusTopo.textContent = "STL pronto";
    } catch (erro) {
        console.error(erro);

        stlBlob = null;
        assinaturaStl = null;

        els.estadoStl.textContent = "Erro ao gerar STL";
        els.mensagemStl.textContent =
            erro?.message ||
            "Falha durante a exportação.";

        els.statusTopo.textContent = "Erro na exportação";
    } finally {
        els.btnGerarStl.disabled = false;
    }
}


function baixarStl() {
    if (
        !stlBlob ||
        assinaturaStl !== assinaturaAtual()
    ) {
        invalidarStl();
        return;
    }

    let nome = els.nomeArquivo.value
        .trim()
        .replace(/\.stl$/i, "")
        .replace(/[^\p{L}\p{N}_-]+/gu, "-")
        .replace(/^-+|-+$/g, "");

    if (!nome) {
        nome = "chaveiro-3d";
    }

    const url = URL.createObjectURL(stlBlob);

    const a = document.createElement("a");

    a.href = url;
    a.download = `${nome}.stl`;

    document.body.appendChild(a);

    a.click();
    a.remove();

    setTimeout(
        () => URL.revokeObjectURL(url),
        1200
    );
}


function sincronizarPar(range, numero, output, casas = 1) {
    const atualizar = (origem, destino) => {
        let valor = Number(origem.value);

        if (!Number.isFinite(valor)) return;

        const min = Number(origem.min);
        const max = Number(origem.max);

        if (Number.isFinite(min)) {
            valor = Math.max(min, valor);
        }

        if (Number.isFinite(max)) {
            valor = Math.min(max, valor);
        }

        origem.value = String(valor);
        destino.value = String(valor);

        output.textContent =
            `${formatarNumero(valor, casas)} mm`;

        invalidarStl();

        if (svgTextoAtual) {
            construirModelo3D();
        }
    };

    range.addEventListener(
        "input",
        () => atualizar(range, numero)
    );

    numero.addEventListener(
        "input",
        () => atualizar(numero, range)
    );
}


function inicializarThree() {
    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(
        42,
        1,
        0.1,
        3000
    );

    renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true
    });

    renderer.setPixelRatio(
        Math.min(window.devicePixelRatio || 1, 2)
    );

    renderer.outputColorSpace =
        THREE.SRGBColorSpace;

    els.viewport.appendChild(
        renderer.domElement
    );

    controls = new OrbitControls(
        camera,
        renderer.domElement
    );

    controls.enableDamping = true;
    controls.dampingFactor = 0.08;

    const hemi = new THREE.HemisphereLight(
        0xffffff,
        0x8a7c75,
        2.15
    );

    scene.add(hemi);

    const key = new THREE.DirectionalLight(
        0xffffff,
        2.1
    );

    key.position.set(
        80,
        -80,
        120
    );

    scene.add(key);

    const fill = new THREE.DirectionalLight(
        0xffe1b8,
        1.15
    );

    fill.position.set(
        -70,
        60,
        60
    );

    scene.add(fill);

    const grid = new THREE.GridHelper(
        300,
        30,
        0x8f7d84,
        0xd4ccc7
    );

    grid.rotation.x = Math.PI / 2;
    grid.position.z = -0.01;

    scene.add(grid);

    const axes = new THREE.AxesHelper(22);
    axes.position.z = 0.01;
    scene.add(axes);

    camera.position.set(
        80,
        -90,
        75
    );

    controls.target.set(
        0,
        0,
        4
    );

    controls.update();

    function redimensionar() {
        const rect =
            els.viewport.getBoundingClientRect();

        const width = Math.max(1, rect.width);
        const height = Math.max(1, rect.height);

        renderer.setSize(
            width,
            height,
            false
        );

        camera.aspect = width / height;
        camera.updateProjectionMatrix();
    }

    const observer = new ResizeObserver(
        redimensionar
    );

    observer.observe(
        els.viewport
    );

    redimensionar();

    const animar = () => {
        controls.update();
        renderer.render(scene, camera);
        requestAnimationFrame(animar);
    };

    animar();
}


const SVG_EXEMPLO = `
<svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 90 38"
    width="90mm"
    height="38mm"
>
    <!--
        Contorno externo + furo em um único path.
        fill-rule evenodd preserva o furo.
    -->
    <path
        d="
            M 10 3
            H 82
            Q 87 3 87 8
            V 30
            Q 87 35 82 35
            H 10
            Q 3 35 3 28
            V 10
            Q 3 3 10 3
            Z

            M 12 12
            A 4.2 4.2 0 1 0 12 20.4
            A 4.2 4.2 0 1 0 12 12
            Z
        "
        fill="none"
        stroke="#ff0000"
        stroke-width="0.35"
        fill-rule="evenodd"
    />

    <path
        d="
            M 28 11
            H 34
            V 15
            H 39
            V 11
            H 45
            V 27
            H 39
            V 21
            H 34
            V 27
            H 28
            Z

            M 50 11
            H 64
            Q 70 11 70 17
            Q 70 23 64 23
            H 56
            V 27
            H 50
            Z

            M 56 16
            V 19
            H 63
            Q 65 19 65 17.5
            Q 65 16 63 16
            Z
        "
        fill="#000000"
        stroke="none"
        fill-rule="evenodd"
    />

    <circle
        cx="77"
        cy="19"
        r="4"
        fill="#0000ff"
        stroke="none"
    />
</svg>
`;




function normalizarBusca(texto) {
    return String(texto ?? "")
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .toLowerCase()
        .trim();
}


async function carregarDadosBiblioteca() {
    if (bibliotecaDados) {
        return bibliotecaDados;
    }

    els.gradeBiblioteca.innerHTML =
        '<div class="biblioteca-vazia">Carregando exemplos...</div>';

    const resposta =
        await fetch(
            "biblioteca/biblioteca.json",
            {
                cache: "no-store"
            }
        );

    if (!resposta.ok) {
        throw new Error(
            `Falha ao carregar os exemplos (${resposta.status}).`
        );
    }

    bibliotecaDados =
        await resposta.json();

    renderizarFiltrosBiblioteca();

    return bibliotecaDados;
}


function renderizarFiltrosBiblioteca() {
    if (!bibliotecaDados) return;

    els.filtrosBiblioteca.innerHTML = "";

    for (const categoria of bibliotecaDados.categorias) {
        const botao =
            document.createElement("button");

        botao.type = "button";
        botao.className =
            "biblioteca-filtro" +
            (
                categoria === bibliotecaCategoria
                    ? " ativo"
                    : ""
            );

        botao.textContent = categoria;

        botao.addEventListener(
            "click",
            () => {
                bibliotecaCategoria = categoria;
                renderizarFiltrosBiblioteca();
                renderizarBiblioteca();
            }
        );

        els.filtrosBiblioteca.appendChild(
            botao
        );
    }
}


function itensBibliotecaFiltrados() {
    if (!bibliotecaDados) return [];

    const busca =
        normalizarBusca(
            bibliotecaBusca
        );

    return bibliotecaDados.itens.filter(
        item => {
            if (
                bibliotecaCategoria !== "Todos" &&
                item.categoria !== bibliotecaCategoria
            ) {
                return false;
            }

            if (!busca) {
                return true;
            }

            const texto =
                normalizarBusca(
                    [
                        item.nome,
                        item.categoria,
                        item.descricao,
                        ...(item.tags ?? [])
                    ].join(" ")
                );

            return texto.includes(busca);
        }
    );
}



async function miniaturaNuria(item) {
    const caminhoSvg =
        item.arquivo;

    if (!caminhoSvg) {
        throw new Error(
            "Exemplo sem arquivo SVG local."
        );
    }

    const chaveCache =
        `${caminhoSvg}?v=${VERSION}`;

    if (
        cacheMiniaturas.has(
            chaveCache
        )
    ) {
        return cacheMiniaturas.get(
            chaveCache
        );
    }

    const resposta =
        await fetch(
            chaveCache,
            {
                cache: "no-store"
            }
        );

    if (!resposta.ok) {
        throw new Error(
            `Falha ao carregar miniatura: ${caminhoSvg}`
        );
    }

    let svg =
        await resposta.text();

    /*
        As cores vermelho/azul continuam no arquivo real porque
        são a convenção técnica do gerador 3D.

        Somente a miniatura é recolorida:
        vermelho -> vinho NuRIA
        azul/preto -> laranja NuRIA
    */
    svg = svg
        .replace(
            /#ff0000/gi,
            "#531C33"
        )
        .replace(
            /#f00\b/gi,
            "#531C33"
        )
        .replace(
            /rgb\(\s*255\s*,\s*0\s*,\s*0\s*\)/gi,
            "#531C33"
        )
        .replace(
            /#0000ff/gi,
            "#E17D01"
        )
        .replace(
            /#00f\b/gi,
            "#E17D01"
        )
        .replace(
            /rgb\(\s*0\s*,\s*0\s*,\s*255\s*\)/gi,
            "#E17D01"
        )
        .replace(
            /#000000/gi,
            "#E17D01"
        )
        .replace(
            /#000\b/gi,
            "#E17D01"
        );

    const blob =
        new Blob(
            [svg],
            {
                type: "image/svg+xml"
            }
        );

    const url =
        URL.createObjectURL(blob);

    cacheMiniaturas.set(
        chaveCache,
        url
    );

    return url;
}

function aplicarMiniaturaNuria(img, item) {
    miniaturaNuria(item)
        .then(
            url => {
                img.src = url;
            }
        )
        .catch(
            erro => {
                console.warn(erro);

                // Fallback: usa o SVG original.
                img.src = item.arquivo;
            }
        );
}

function renderizarBiblioteca() {
    if (!bibliotecaDados) return;

    const itens =
        itensBibliotecaFiltrados();

    els.gradeBiblioteca.innerHTML = "";

    els.bibliotecaContagem.textContent =
        `${itens.length} ${
            itens.length === 1
                ? "modelo"
                : "modelos"
        }`;

    els.bibliotecaVazia.hidden =
        itens.length > 0;

    for (const item of itens) {
        const card =
            document.createElement("article");

        card.className =
            "biblioteca-card";

        const tags =
            (item.tags ?? [])
                .slice(0, 3)
                .map(
                    tag =>
                        `<span>${tag}</span>`
                )
                .join("");

        card.innerHTML = `
            <div class="biblioteca-preview">
                <img
                    src=""
                    data-arquivo-svg="${item.arquivo ?? item.fonteSvg ?? ""}"
                    alt="${item.nome}"
                    loading="lazy"
                >

                <span class="biblioteca-categoria">
                    ${item.categoria}
                </span>
            </div>

            <div class="biblioteca-card-conteudo">
                <h3>${item.nome}</h3>

                ${
                    item.categoria === "Emojis"
                        ? `
                            <div class="biblioteca-origem">
                                Exemplo SVG NuRIA
                            </div>
                        `
                        : ""
                }

                <p>${item.descricao}</p>

                <div class="biblioteca-tags">
                    ${tags}
                </div>

                <button
                    class="biblioteca-usar"
                    type="button"
                >
                    Usar este modelo
                </button>
            </div>
        `;

        card
            .querySelector(".biblioteca-usar")
            .addEventListener(
                "click",
                () => usarItemBiblioteca(item)
            );

        const imgPreview =
            card.querySelector(
                ".biblioteca-preview img"
            );

        aplicarMiniaturaNuria(
            imgPreview,
            item
        );

        els.gradeBiblioteca.appendChild(
            card
        );
    }
}


async function abrirBiblioteca() {
    els.modalBiblioteca.hidden = false;
    els.modalBiblioteca.setAttribute(
        "aria-hidden",
        "false"
    );

    document.body.classList.add(
        "modal-aberto"
    );

    try {
        await carregarDadosBiblioteca();

        renderizarBiblioteca();

        setTimeout(
            () => els.buscaBiblioteca.focus(),
            0
        );
    } catch (erro) {
        console.error(erro);

        els.gradeBiblioteca.innerHTML = "";

        els.bibliotecaVazia.hidden = false;
        els.bibliotecaVazia.textContent =
            "Não foi possível carregar os exemplos. " +
            "Execute o projeto por um servidor HTTP local.";
    }
}


function fecharBiblioteca() {
    els.modalBiblioteca.hidden = true;
    els.modalBiblioteca.setAttribute(
        "aria-hidden",
        "true"
    );

    document.body.classList.remove(
        "modal-aberto"
    );
}


async function usarItemBiblioteca(item) {
    const botao =
        Array.from(
            els.gradeBiblioteca
                .querySelectorAll(
                    ".biblioteca-usar"
                )
        )
        .find(
            b =>
                b.closest(
                    ".biblioteca-card"
                )
                ?.querySelector("h3")
                ?.textContent ===
                item.nome
        );

    const textoOriginal =
        botao?.textContent;

    try {
        if (botao) {
            botao.disabled = true;
            botao.innerHTML =
                '<span class="spinner"></span>Carregando...';
        }

        if (!item.arquivo) {
            throw new Error(
                "Este exemplo não possui um SVG local."
            );
        }

        const urlArquivo =
            `${item.arquivo}?v=${VERSION}`;

        const resposta =
            await fetch(
                urlArquivo,
                {
                    cache: "no-store"
                }
            );

        if (!resposta.ok) {
            throw new Error(
                `Falha ao carregar ${item.nome}.`
            );
        }

        const svg =
            await resposta.text();

        els.letrasFuradas.checked =
            Boolean(item.furado);

        els.letrasFuradas
            .closest(".check-card")
            ?.classList.toggle(
                "ativo",
                els.letrasFuradas.checked
            );

        els.modoDetalhe.value =
            "alto";

        els.controleAlturaDetalhe.hidden =
            false;

        aplicarLarguraDoExemplo(
            item
        );

        processarSvg(
            svg,
            item.arquivo
                .split("/")
                .pop()
        );

        fecharBiblioteca();

        els.statusTopo.textContent =
            `Exemplos · ${item.nome}`;
    } catch (erro) {
        console.error(erro);

        els.bibliotecaVazia.hidden =
            false;

        els.bibliotecaVazia.textContent =
            erro?.message ||
            "Não foi possível carregar o exemplo.";
    } finally {
        if (botao) {
            botao.disabled = false;
            botao.textContent =
                textoOriginal ||
                "Usar este modelo";
        }
    }
}


function registrarEventos() {
    els.btnEscolherSvg.addEventListener(
        "click",
        () => els.arquivoSvg.click()
    );

    els.arquivoSvg.addEventListener(
        "change",
        async () => {
            const file = els.arquivoSvg.files?.[0];

            if (!file) return;

            const texto = await file.text();

            processarSvg(
                texto,
                file.name
            );
        }
    );

    els.btnBiblioteca.addEventListener(
        "click",
        abrirBiblioteca
    );

    els.btnFecharBiblioteca.addEventListener(
        "click",
        fecharBiblioteca
    );

    els.modalBiblioteca
        .querySelectorAll("[data-fechar-biblioteca]")
        .forEach(
            elemento => {
                elemento.addEventListener(
                    "click",
                    fecharBiblioteca
                );
            }
        );

    els.buscaBiblioteca.addEventListener(
        "input",
        () => {
            bibliotecaBusca =
                els.buscaBiblioteca.value;

            renderizarBiblioteca();
        }
    );

    document.addEventListener(
        "keydown",
        evento => {
            if (
                evento.key === "Escape" &&
                !els.modalBiblioteca.hidden
            ) {
                fecharBiblioteca();
            }
        }
    );

    sincronizarPar(
        els.larguraFinal,
        els.larguraFinalNumero,
        els.larguraFinalValor,
        0
    );

    sincronizarPar(
        els.espessuraBase,
        els.espessuraBaseNumero,
        els.espessuraBaseValor,
        1
    );

    sincronizarPar(
        els.alturaDetalhe,
        els.alturaDetalheNumero,
        els.alturaDetalheValor,
        1
    );

    els.modoDetalhe.addEventListener(
        "change",
        () => {
            els.controleAlturaDetalhe.hidden =
                els.modoDetalhe.value === "nenhum";

            invalidarStl();

            if (svgTextoAtual) {
                construirModelo3D();
            }
        }
    );

    els.letrasFuradas.addEventListener(
        "change",
        () => {
            const ativo =
                els.letrasFuradas.checked;

            els.letrasFuradas
                .closest(".check-card")
                ?.classList.toggle(
                    "ativo",
                    ativo
                );

            invalidarStl();

            if (svgTextoAtual) {
                construirModelo3D();
            }

            els.statusTopo.textContent =
                ativo
                    ? "Letras furadas"
                    : "Letras em relevo";
        }
    );

    els.btnCentralizar.addEventListener(
        "click",
        () => centralizarModelo(true)
    );

    els.btnGerarStl.addEventListener(
        "click",
        gerarStl
    );

    els.btnBaixarStl.addEventListener(
        "click",
        baixarStl
    );

    els.nomeArquivo.addEventListener(
        "input",
        () => {
            // Renomear não invalida a geometria.
        }
    );
}


function iniciar() {
    /*
        40 mm é o tamanho inicial oficial do chaveiro.
        Aplicamos antes dos listeners para impedir que valores
        restaurados pelo navegador (ex.: 60 mm) prevaleçam.
    */
    aplicarLarguraPadraoInicial();

    inicializarThree();
    registrarEventos();

    els.controleAlturaDetalhe.hidden =
        els.modoDetalhe.value === "nenhum";

    els.statusTopo.textContent =
        `Aguardando SVG · ${VERSION}`;
}


iniciar();
