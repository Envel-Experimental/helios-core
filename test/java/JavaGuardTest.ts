import { filterApplicableJavaPaths, HotSpotSettings, JavaVersion, JvmDetails, parseJavaRuntimeVersion, rankApplicableJvms, Win32RegistryJavaDiscoverer } from '../../lib/java/JavaGuard'
import { expect } from 'chai'

function simulatePlatformAndArch(platform: string, arch: string, callback: () => void) {
    const originalPlatform = process.platform;
    const originalArch = process.arch;

    Object.defineProperty(process, 'platform', { value: platform });
    Object.defineProperty(process, 'arch', { value: arch });

    callback();

    Object.defineProperty(process, 'platform', { value: originalPlatform });
    Object.defineProperty(process, 'arch', { value: originalArch });
}

describe('JavaGuard', () => {

    // Only defining the properties that the function actually uses.
    const discovered: { [path: string]: HotSpotSettings } = {
        // x64 JDK
        'path/to/jdk-64/21': {
            'sun.arch.data.model': '64',
            'os.arch': 'amd64',
            'java.version': '21.0.0',
            'java.runtime.version': '21.0.0+1',
            'java.vendor': 'Eclipse Adoptium'
        } as HotSpotSettings,
        'path/to/jdk-64/17': {
            'sun.arch.data.model': '64',
            'os.arch': 'amd64',
            'java.version': '17.0.5',
            'java.runtime.version': '17.0.5+8',
            'java.vendor': 'Eclipse Adoptium'
        } as HotSpotSettings,
        'path/to/jdk-64/8': {
            'sun.arch.data.model': '64',
            'os.arch': 'amd64',
            'java.version': '1.8.0_362',
            'java.runtime.version': '1.8.0_362-b09',
            'java.vendor': 'Eclipse Adoptium'
        } as HotSpotSettings,
    
        // ARM64 JDK
        'path/to/jdk-arm64/21': {
            'sun.arch.data.model': '64',
            'os.arch': 'aarch64',
            'java.version': '21.0.0',
            'java.runtime.version': '21.0.0+1',
            'java.vendor': 'Eclipse Adoptium'
        } as HotSpotSettings,
        'path/to/jdk-arm64/17': {
            'sun.arch.data.model': '64',
            'os.arch': 'aarch64',
            'java.version': '17.0.5',
            'java.runtime.version': '17.0.5+8',
            'java.vendor': 'Eclipse Adoptium'
        } as HotSpotSettings,
        'path/to/jdk-arm64/8': {
            'sun.arch.data.model': '64',
            'os.arch': 'aarch64',
            'java.version': '1.8.0_362',
            'java.runtime.version': '1.8.0_362-b09',
            'java.vendor': 'Eclipse Adoptium'
        } as HotSpotSettings
    };

    it('Jvm Filtering on all platforms and architectures', async () => {
        const platforms = ['win32', 'darwin', 'linux'];
        const architectures = ['x64', 'arm64'];
    
        for (const platform of platforms) {
            for (const arch of architectures) {
                simulatePlatformAndArch(platform, arch, () => {
                    const rangeWithAssertions: { [range: string]: (details: JvmDetails[]) => void } = {
                        '>=17.x': details => {
                            if (platform === 'darwin' && arch === 'arm64') {
                                expect(details.map(({ path }) => path)).to.have.members([
                                    'path/to/jdk-64/21',
                                    'path/to/jdk-64/17'
                                ]);
                            } else {
                                expect(details.map(({ path }) => path)).to.have.members([
                                    'path/to/jdk-64/21',
                                    'path/to/jdk-64/17',
                                    'path/to/jdk-arm64/21',
                                    'path/to/jdk-arm64/17'
                                ]);
                            }
                        },
                        '8.x': details => {
                            if (platform === 'darwin' && arch === 'arm64') {
                                expect(details.map(({ path }) => path)).to.have.members([
                                    'path/to/jdk-64/8'
                                ]);
                            } else {
                                expect(details.map(({ path }) => path)).to.have.members([
                                    'path/to/jdk-64/8',
                                    'path/to/jdk-arm64/8'
                                ]);
                            }
                        }
                    };
    
                    for (const [range, assertion] of Object.entries(rangeWithAssertions)) {
                        const details = filterApplicableJavaPaths(discovered, range, true);
                        assertion(details);
                    }
                });
            }
        }
    });

    it('Jvm Filtering on macOS ARM64 with isVersionBelow120 = false', async () => {
        simulatePlatformAndArch('darwin', 'arm64', () => {
            const rangeWithAssertions: { [range: string]: (details: JvmDetails[]) => void } = {
                '>=17.x': details => {
                    expect(details.map(({ path }) => path)).to.have.members([
                        'path/to/jdk-arm64/21',
                        'path/to/jdk-arm64/17'
                    ]);
                },
                '8.x': details => {
                    expect(details.map(({ path }) => path)).to.have.members([
                        'path/to/jdk-arm64/8'
                    ]);
                }
            };
    
            for (const [range, assertion] of Object.entries(rangeWithAssertions)) {
                const details = filterApplicableJavaPaths(discovered, range, false);
                assertion(details);
            }
        });
    });

    it('Jvm Filtering on macOS ARM64 with isVersionBelow120 = true', async () => {
        simulatePlatformAndArch('darwin', 'arm64', () => {
            const rangeWithAssertions: { [range: string]: (details: JvmDetails[]) => void } = {
                '>=17.x': details => {
                    expect(details.map(({ path }) => path)).to.have.members([
                        'path/to/jdk-64/21',
                        'path/to/jdk-64/17'
                    ]);
    
                    details.forEach(detail => {
                        const settings = discovered[detail.path];
                        expect(settings['os.arch']).to.equal('amd64');
                    });
                },
                '8.x': details => {
                    expect(details.map(({ path }) => path)).to.have.members([
                        'path/to/jdk-64/8'
                    ]);
    
                    details.forEach(detail => {
                        const settings = discovered[detail.path];
                        expect(settings['os.arch']).to.equal('amd64');
                    });
                }
            };
    
            for (const [range, assertion] of Object.entries(rangeWithAssertions)) {
                const details = filterApplicableJavaPaths(discovered, range, true);
                assertion(details);
            }
        });
    });

    it('Jvm Filtering on other platforms with isVersionBelow120 = false', async () => {
        const platforms = ['win32', 'linux'];
        const architectures = ['x64', 'arm64'];
    
        for (const platform of platforms) {
            for (const arch of architectures) {
                simulatePlatformAndArch(platform, arch, () => {
                    const rangeWithAssertions: { [range: string]: (details: JvmDetails[]) => void } = {
                        '>=17.x': details => {
                            expect(details.map(({ path }) => path)).to.have.members([
                                'path/to/jdk-64/21',
                                'path/to/jdk-64/17',
                                'path/to/jdk-arm64/21',
                                'path/to/jdk-arm64/17'
                            ]);
                        },
                        '8.x': details => {
                            expect(details.map(({ path }) => path)).to.have.members([
                                'path/to/jdk-64/8',
                                'path/to/jdk-arm64/8'
                            ]);
                        }
                    };
    
                    for (const [range, assertion] of Object.entries(rangeWithAssertions)) {
                        const details = filterApplicableJavaPaths(discovered, range, false);
                        assertion(details);
                    }
                });
            }
        }
    });

    it('Jvm Selection', async () => {

        const rangeWithAssertions: { [range: string]: (details: JvmDetails | null) => void } = {
            '>=17.x': details => {
                expect(details).to.not.be.null
                expect(details!.path).to.equal('path/to/jdk-64/21')
            },
            '^17.x': details => {
                expect(details).to.not.be.null
                expect(details!.path).to.equal('path/to/jdk-64/17')
            },
            '9.x': details => {
                expect(details).to.be.null
            },
            '8.x': details => {
                expect(details).to.not.be.null
                expect(details!.path).to.equal('path/to/jdk-64/8')
            }
        }

        for(const [ range, assertion ] of Object.entries(rangeWithAssertions)) {
            const details = filterApplicableJavaPaths(discovered, range)
            rankApplicableJvms(details)
            assertion(details.length > 0 ? details[0] : null)
        }
    })

    it('Java Version Parsing', async () => {

        const testMatrix: [string, JavaVersion | null][] = [
            ['1.8.0_351', { major: 8, minor: 0, patch: 351 }],
            ['1.8.0_351-b10', { major: 8, minor: 0, patch: 351 }],
            ['17.0.5', { major: 17, minor: 0, patch: 5 }],
            ['17.0.5.8', { major: 17, minor: 0, patch: 5 }],
            ['17.0.6+9-LTS-190', { major: 17, minor: 0, patch: 6 }],
            ['abc', null],
            ['1.8', null],
            ['17.0', null]
        ]

        for(const [test, res] of testMatrix) {
            expect(parseJavaRuntimeVersion(test)).to.deep.equal(res)
        }
    })

    it('Jvm Filtering on macOS ARM64 (Java 8, 17, 21)', async () => {
        const originalPlatform = process.platform;
        const originalArch = process.arch;
        Object.defineProperty(process, 'platform', { value: 'darwin' });
        Object.defineProperty(process, 'arch', { value: 'arm64' });
    
        const detailsBelow120 = filterApplicableJavaPaths(discovered, '>=1.8.x', true);
        expect(detailsBelow120.map(({ path }) => path)).to.have.members([
            'path/to/jdk-64/8',
            'path/to/jdk-64/17',
            'path/to/jdk-64/21'
        ]);
    
        const detailsAbove120 = filterApplicableJavaPaths(discovered, '>=1.8.x', false);
        expect(detailsAbove120.map(({ path }) => path)).to.have.members([
            'path/to/jdk-arm64/8',
            'path/to/jdk-arm64/17',
            'path/to/jdk-arm64/21'
        ]);
    
        Object.defineProperty(process, 'platform', { value: originalPlatform });
        Object.defineProperty(process, 'arch', { value: originalArch });
    });

    it('Jvm Selection on macOS ARM64 (Java 8, 17, 21)', async () => {
        const originalPlatform = process.platform;
        const originalArch = process.arch;
        Object.defineProperty(process, 'platform', { value: 'darwin' });
        Object.defineProperty(process, 'arch', { value: 'arm64' });
    
        const details = filterApplicableJavaPaths(discovered, '>=1.8.x', false);
        rankApplicableJvms(details);
    
        expect(details[0].path).to.equal('path/to/jdk-arm64/21');
        expect(details[1].path).to.equal('path/to/jdk-arm64/17');
        expect(details[2].path).to.equal('path/to/jdk-arm64/8');
    
        Object.defineProperty(process, 'platform', { value: originalPlatform });
        Object.defineProperty(process, 'arch', { value: originalArch });
    });

    it.skip('Win32 Registry Keys', async () => {

        const res = await (new Win32RegistryJavaDiscoverer()).discover()

        for(const file of res) {
            console.log(file)
        }

    })

})