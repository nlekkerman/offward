function decimalInteger(value) {
  const [mantissa, exponent = '0'] = String(value).toLowerCase().split('e')
  const negative = mantissa.startsWith('-')
  const digits = mantissa.replace('-', '').split('.')
  const scale = (digits[1]?.length || 0) - Number(exponent)
  let integer = BigInt(digits.join(''))
  if (negative) integer = -integer
  return scale < 0
    ? { integer: integer * 10n ** BigInt(-scale), scale: 0 }
    : { integer, scale }
}

function roundEven(numerator, denominator) {
  const negative = numerator < 0n
  const absolute = negative ? -numerator : numerator
  let result = absolute / denominator
  const remainder = absolute % denominator
  if (remainder * 2n > denominator || (remainder * 2n === denominator && result % 2n !== 0n)) result += 1n
  return negative ? -result : result
}

function binaryInteger(value) {
  const buffer = new ArrayBuffer(8)
  const view = new DataView(buffer)
  view.setFloat64(0, value)
  const bits = view.getBigUint64(0)
  const exponent = Number((bits >> 52n) & 2047n)
  const fraction = bits & ((1n << 52n) - 1n)
  const integer = exponent ? ((1n << 52n) | fraction) << BigInt(exponent - 1) : fraction
  return bits >> 63n ? -integer : integer
}

function validProjection([ax, ay, bx, by, cx, cy], scale, candidate, isFirst, isLast) {
  const dx = bx - ax
  const dy = by - ay
  const denominator = dx * dx + dy * dy
  if (!denominator) return false
  const numerator = (cx - ax) * dx + (cy - ay) * dy
  if (numerator < 0n || numerator > denominator || (isFirst && numerator === 0n) || (isLast && numerator === denominator)) return false
  const divisor = denominator * scale
  const projectedX = ax * denominator + dx * numerator
  const projectedY = ay * denominator + dy * numerator
  const roundedX = roundEven(projectedX * 1000000n, divisor)
  const roundedY = roundEven(projectedY * 1000000n, divisor)
  if (roundedX !== BigInt(Math.round(candidate[0] * 1000000)) || roundedY !== BigInt(Math.round(candidate[1] * 1000000))) return false
  const differenceX = Number(roundEven((projectedX - cx * denominator) * 1000000000000n, divisor)) / 1e12
  const differenceY = Number(roundEven((projectedY - cy * denominator) * 1000000000000n, divisor)) / 1e12
  return Math.hypot(differenceX, differenceY) * 112000 < 0.079
}

// Check both decimal and binary interpretations of coordinates; reject rounding-boundary ambiguity.
function validRoundedProjection(start, end, candidate, isFirst, isLast) {
  const numbers = [...start.slice(0, 2), ...end.slice(0, 2), ...candidate]
  const values = numbers.map(decimalInteger)
  const scale = Math.max(...values.map((value) => value.scale))
  const decimal = values.map(({ integer, scale: current }) => integer * 10n ** BigInt(scale - current))
  return validProjection(decimal, 10n ** BigInt(scale), candidate, isFirst, isLast)
    && validProjection(numbers.map(binaryInteger), 1n << 1074n, candidate, isFirst, isLast)
}

export function getSplitPosition(geometry, edgeIndex, click) {
  const coordinates = geometry.coordinates
  const start = coordinates[edgeIndex]
  const end = coordinates[edgeIndex + 1]
  if (!start || !end || ![...start.slice(0, 2), ...end.slice(0, 2)].every(Number.isFinite)) return null
  const dx = end[0] - start[0]
  const dy = end[1] - start[1]
  const length = dx * dx + dy * dy
  if (!length) return null
  const t = Math.max(0, Math.min(1, ((click[0] - start[0]) * dx + (click[1] - start[1]) * dy) / length))
  const x = Math.round((start[0] + t * dx) * 1000000)
  const y = Math.round((start[1] + t * dy) * 1000000)
  const options = []
  for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
    for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
      const candidate = [(x + offsetX) / 1000000, (y + offsetY) / 1000000]
      if (candidate[0] < -180 || candidate[0] > 180 || candidate[1] < -90 || candidate[1] > 90) continue
      const first = coordinates[0]
      const last = coordinates[coordinates.length - 1]
      if ((edgeIndex === 0 && candidate[0] === first[0] && candidate[1] === first[1])
        || (edgeIndex === coordinates.length - 2 && candidate[0] === last[0] && candidate[1] === last[1])) continue
      if (validRoundedProjection(start, end, candidate, edgeIndex === 0, edgeIndex === coordinates.length - 2)) {
        options.push(candidate)
      }
    }
  }
  options.sort((a, b) => Math.hypot(a[0] - click[0], a[1] - click[1]) - Math.hypot(b[0] - click[0], b[1] - click[1]))
  return options[0] || null
}
